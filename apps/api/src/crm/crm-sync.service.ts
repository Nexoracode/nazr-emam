import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Money, NazrRequest, Payment } from '@nazr-emam/shared';
import { NazrRequestEntity } from '../modules/nazr-requests/entities/nazr-request.entity';
import { PaymentEntity } from '../modules/payments/entities/payment.entity';
import { CrmConfigService } from './crm.config';
import { Crm24ClientService } from './crm24-client.service';

interface CrmIdResponse {
  id: string;
}

/**
 * همگام‌سازی داده‌های نذر امام با CRM24 (بدون عبور از سپیدار):
 * - مخاطب: find-or-create بر اساس موبایل (ماژول Contacts)
 * - طرح نذر: find-or-create بر اساس عنوان (ماژول Services) برای related_to
 * - پرداخت موفق: یک رکورد Payments با مبلغ و کد رهگیری
 * همه خطاها فقط لاگ می‌شوند — ثبت نذر هرگز به‌خاطر CRM نباید شکست بخورد.
 */
@Injectable()
export class CrmSyncService {
  private readonly logger = new Logger(CrmSyncService.name);

  constructor(
    private readonly client: Crm24ClientService,
    private readonly crmConfig: CrmConfigService,
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepo: Repository<PaymentEntity>,
  ) {}

  /** نذرِ واریزشده را بر اساس شناسه پرداخت به CRM می‌فرستد. */
  async syncByPaymentId(paymentId: string): Promise<void> {
    if (!this.crmConfig.enabled) return;
    const payment = await this.paymentsRepo.findOne({
      where: { id: paymentId },
      relations: { nazrRequest: { nazrType: true } },
    });
    if (!payment?.nazrRequest) return;
    await this.syncPaidNazr(this.toNazrDto(payment.nazrRequest), this.toPaymentDto(payment));
  }

  private toNazrDto(entity: NazrRequestEntity): NazrRequest {
    return {
      id: entity.id,
      trackingCode: entity.trackingCode,
      userId: entity.userId,
      nazrType: {
        id: entity.nazrType.id,
        slug: entity.nazrType.slug,
        title: entity.nazrType.title,
        description: entity.nazrType.description,
        suggestedAmount: entity.nazrType.suggestedAmount,
        isActive: entity.nazrType.isActive,
        createdAt: entity.nazrType.createdAt.toISOString(),
        updatedAt: entity.nazrType.updatedAt.toISOString(),
      },
      donorFullName: entity.donorFullName,
      donorFirstName: entity.donorFirstName,
      donorLastName: entity.donorLastName,
      donorGender: entity.donorGender,
      donorMobile: entity.donorMobile,
      donorNationalCode: entity.donorNationalCode,
      amount: entity.amount,
      note: entity.note,
      isAnonymous: entity.isAnonymous,
      isMonthlyFixed: entity.isMonthlyFixed,
      wantsMonthlyFollowUp: entity.wantsMonthlyFollowUp,
      status: entity.status,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private toPaymentDto(entity: PaymentEntity): Payment {
    return {
      id: entity.id,
      nazrRequestId: entity.nazrRequestId,
      method: entity.method,
      status: entity.status,
      amount: entity.amount,
      transactionReference: entity.transactionReference,
      receiptUrl: entity.receiptUrl,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  /** مخاطب را بر اساس موبایل پیدا یا بساز؛ id رکورد CRM را برمی‌گرداند. */
  async upsertContact(input: {
    firstName: string | null;
    lastName: string | null;
    mobile: string;
    gender?: 'male' | 'female' | null;
  }): Promise<string | null> {
    if (!this.crmConfig.enabled) return null;
    try {
      const mobile = input.mobile.trim();
      const existing = await this.client.query<{ id: string }>(
        `SELECT id FROM Contacts WHERE mobile='${mobile.replace(/'/g, '')}' LIMIT 1;`,
      );
      if (existing.length > 0) return existing[0].id;

      const salutation =
        input.gender === 'male' ? 'آقا' : input.gender === 'female' ? 'خانم' : '';
      const created = await this.client.create<CrmIdResponse>('Contacts', {
        firstname: input.firstName ?? '',
        lastname: input.lastName ?? 'نذردار',
        mobile,
        salutationtype: salutation,
        leadsource: 'وب‌سایت نذر امام',
        assigned_user_id: this.crmConfig.config!.assignedUserId,
        description: 'ثبت‌شده از طریق وب‌سایت نذر امام',
      });
      this.logger.log(`مخاطب CRM ساخته شد: ${mobile} → ${created.id}`);
      return created.id;
    } catch (error) {
      this.logger.error(`CRM upsertContact ناموفق: ${this.errMessage(error)}`);
      return null;
    }
  }

  /** طرح نذر را به‌عنوان Service در CRM پیدا یا بساز (برای related_to پرداخت). */
  private async upsertPlanService(planTitle: string): Promise<string | null> {
    try {
      const safeTitle = planTitle.replace(/'/g, '');
      const existing = await this.client.query<{ id: string }>(
        `SELECT id FROM Services WHERE servicename='${safeTitle}' LIMIT 1;`,
      );
      if (existing.length > 0) return existing[0].id;

      const created = await this.client.create<CrmIdResponse>('Services', {
        servicename: planTitle,
        // فیلد اجباری «کد حسابداری سپیدار» — چون از سپیدار عبور نمی‌کنیم مقدار
        // صوریِ پایدار می‌گذاریم تا رکورد ساخته شود.
        cf_1642: `NE-${safeTitle}`,
        description: 'طرح نذر وب‌سایت نذر امام',
        assigned_user_id: this.crmConfig.config!.assignedUserId,
      });
      this.logger.log(`سرویس طرح CRM ساخته شد: ${planTitle} → ${created.id}`);
      return created.id;
    } catch (error) {
      this.logger.error(`CRM upsertPlanService ناموفق: ${this.errMessage(error)}`);
      return null;
    }
  }

  /** پس از پرداخت موفق: مخاطب + پرداخت را به CRM بفرستد. */
  private async syncPaidNazr(nazr: NazrRequest, payment: Payment): Promise<void> {
    try {
      const contactId = await this.upsertContact({
        firstName: nazr.donorFirstName ?? nazr.donorFullName.split(' ')[0] ?? null,
        lastName:
          nazr.donorLastName ?? nazr.donorFullName.split(' ').slice(1).join(' ') ?? null,
        mobile: nazr.donorMobile,
        gender: nazr.donorGender,
      });
      if (!contactId) return;
      const serviceId = await this.upsertPlanService(nazr.nazrType.title);

      const created = await this.client.create<CrmIdResponse>('Payments', {
        relatedcontact: contactId,
        ...(serviceId ? { related_to: serviceId } : {}),
        amount_currency_value: this.tomanAmount(payment.amount),
        paymentsstatus: 'پرداخت شده',
        paymentsmode:
          payment.method === 'online'
            ? 'پرداخت آنلاین'
            : payment.method === 'card_to_card'
              ? 'کارت به کارت'
              : 'سایر',
        datereceived: this.jalaliDate(new Date(nazr.createdAt)),
        tracking_code: nazr.trackingCode,
        description: `نذر «${nazr.nazrType.title}» — ${nazr.isMonthlyFixed ? 'تعهد ماهانه؛ ' : ''}${nazr.wantsMonthlyFollowUp ? 'درخواست پیگیری ماهانه؛ ' : ''}${payment.transactionReference ? `مرجع: ${payment.transactionReference}` : ''}`.trim(),
        assigned_user_id: this.crmConfig.config!.assignedUserId,
      });
      this.logger.log(
        `پرداخت CRM ساخته شد: ${nazr.trackingCode} → ${created.id} (مخاطب ${contactId})`,
      );
    } catch (error) {
      this.logger.error(`CRM syncPaidNazr ناموفق: ${this.errMessage(error)}`);
    }
  }

  private tomanAmount(amount: Money): number {
    return amount.currency === 'IRR' ? Math.round(amount.amount / 10) : amount.amount;
  }

  /** تاریخ شمسی YYYY-MM-DD برای فیلد date در CRM. */
  private jalaliDate(date: Date): string {
    const fmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Tehran',
    });
    return fmt
      .format(date)
      .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  }

  private errMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
