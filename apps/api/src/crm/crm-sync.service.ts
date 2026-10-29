import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NazrRequestEntity } from '../modules/nazr-requests/entities/nazr-request.entity';
import { PaymentEntity } from '../modules/payments/entities/payment.entity';
import { CrmConfigService } from './crm.config';
import { Crm24ClientService } from './crm24-client.service';

interface CrmIdResponse {
  id: string;
}

/** نگاشت slug طرح به مقدار picklist «نیت پرداخت نذر» در CRM. */
const PLAN_INTENT_BY_SLUG: Record<string, string> = {
  international: 'بین الملل',
  'nazr-royesh': 'رویش',
  'niaz-rooz': 'نیاز روز',
};

/** نام سرویس CRM و کد حسابداری آن (طبق مشخصات: نذر امام با کد 1111). */
const NAZR_SERVICE_NAME = 'نذر امام';
const NAZR_SERVICE_CODE = '1111';

/**
 * همگام‌سازی نذر امام با CRM24 (vtiger) — مستقیم، بدون عبور از سپیدار.
 *
 * نگاشت مخاطب (Contacts): نام، نام خانوادگی، شماره تماس، جنسیت،
 * منبع سرنخ «سایت نذر امام»، «مرتبط با نذر امام: بله».
 *
 * نگاشت پرداخت (Payments): سرویس «نذر امام» (کد حسابداری 1111)، مبلغ،
 * وضعیت (در انتظار پرداخت ← پس از پرداخت: پرداخت شده)، حالت (پرداخت آنلاین/
 * کارت به کارت)، ارجاع به کاربر CRM، نوع پرداخت «نذر امام»، نیت پرداخت
 * (بین الملل/رویش/نیاز روز)، توضیحات = یادداشت اختیاری سایت.
 *
 * همه خطاها فقط لاگ می‌شوند — جریان نذر هرگز به‌خاطر CRM نمی‌شکند.
 */
@Injectable()
export class CrmSyncService {
  private readonly logger = new Logger(CrmSyncService.name);

  constructor(
    private readonly client: Crm24ClientService,
    private readonly crmConfig: CrmConfigService,
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepo: Repository<PaymentEntity>,
    @InjectRepository(NazrRequestEntity)
    private readonly nazrRequestsRepo: Repository<NazrRequestEntity>,
  ) {}

  /** پس از ثبت نذر: مخاطب + پرداختِ «در انتظار پرداخت» در CRM. */
  async syncNewNazr(nazrId: string): Promise<void> {
    if (!this.crmConfig.enabled) return;
    try {
      const nazr = await this.nazrRequestsRepo.findOne({
        where: { id: nazrId },
        relations: { nazrType: true },
      });
      if (!nazr) return;

      const contactId = await this.upsertContact(nazr);
      if (!contactId) return;

      await this.client.create('Payments', {
        relatedcontact: contactId,
        amount_currency_value: this.tomanAmount(nazr.amount),
        paymentsstatus: 'در انتظار پرداخت',
        paymenttype: 'نذر امام',
        cf_1764: 'نذر امام',
        ...(this.planIntent(nazr) ? { cf_1781: this.planIntent(nazr) } : {}),
        tracking_code: nazr.trackingCode,
        description: nazr.note ?? '',
        assigned_user_id: this.crmConfig.config!.assignedUserId,
      });
      this.logger.log(`پرداخت درانتظار CRM ساخته شد: ${nazr.trackingCode}`);
    } catch (error) {
      this.logger.error(`CRM syncNewNazr ناموفق: ${this.errMessage(error)}`);
    }
  }

  /** پس از پرداخت موفق: رکورد CRM مرتبط را «پرداخت شده» می‌کند. */
  async syncByPaymentId(paymentId: string): Promise<void> {
    if (!this.crmConfig.enabled) return;
    try {
      const payment = await this.paymentsRepo.findOne({
        where: { id: paymentId },
        relations: { nazrRequest: { nazrType: true } },
      });
      if (!payment?.nazrRequest) return;
      const nazr = payment.nazrRequest;

      const contactId = await this.upsertContact(nazr);
      if (!contactId) return;

      const paidFields = {
        relatedcontact: contactId,
        amount_currency_value: this.tomanAmount(payment.amount),
        paymentsstatus: 'پرداخت شده',
        paymentsmode:
          payment.method === 'card_to_card' ? 'کارت به کارت' : 'پرداخت آنلاین',
        datereceived: this.jalaliDate(new Date()),
        paymenttype: 'نذر امام',
        cf_1764: 'نذر امام',
        ...(this.planIntent(nazr) ? { cf_1781: this.planIntent(nazr) } : {}),
        tracking_code: nazr.trackingCode,
        description: nazr.note ?? '',
        assigned_user_id: this.crmConfig.config!.assignedUserId,
      };

      // رکوردِ «در انتظار پرداخت»ی که هنگام ثبت نذر ساختیم را پیدا و به‌روزرسانی کن؛
      // اگر نبود (مثلاً CRM بعداً فعال شده) مستقیماً رکورد پرداخت‌شده بساز.
      const existing = await this.client.query<{ id: string }>(
        `SELECT id FROM Payments WHERE tracking_code='${nazr.trackingCode.replace(/'/g, '')}' LIMIT 1;`,
      );
      if (existing.length > 0) {
        await this.client.update('Payments', { id: existing[0].id, ...paidFields });
        this.logger.log(`پرداخت CRM به‌روزرسانی شد: ${nazr.trackingCode} → ${existing[0].id}`);
      } else {
        const serviceId = await this.nazrServiceId();
        const created = await this.client.create<CrmIdResponse>('Payments', {
          ...paidFields,
          ...(serviceId ? { related_to: serviceId } : {}),
        });
        this.logger.log(`پرداخت CRM ساخته شد: ${nazr.trackingCode} → ${created.id}`);
      }
    } catch (error) {
      this.logger.error(`CRM syncByPaymentId ناموفق: ${this.errMessage(error)}`);
    }
  }

  /** مخاطب را بر اساس موبایل پیدا یا بساز. */
  private async upsertContact(nazr: NazrRequestEntity): Promise<string | null> {
    const mobile = nazr.donorMobile.trim();
    const existing = await this.client.query<{ id: string }>(
      `SELECT id FROM Contacts WHERE mobile='${mobile.replace(/'/g, '')}' LIMIT 1;`,
    );
    if (existing.length > 0) return existing[0].id;

    const created = await this.client.create<CrmIdResponse>('Contacts', {
      firstname: nazr.donorFirstName ?? '',
      lastname: nazr.donorLastName ?? nazr.donorFullName,
      mobile,
      cf_1570: nazr.donorGender === 'male' ? 'آقا' : nazr.donorGender === 'female' ? 'خانم' : '',
      leadsource: 'سایت نذر امام',
      cf_1756: 'بله',
      assigned_user_id: this.crmConfig.config!.assignedUserId,
    });
    this.logger.log(`مخاطب CRM ساخته شد: ${mobile} → ${created.id}`);
    return created.id;
  }

  /** سرویس «نذر امام» (کد حسابداری 1111) را پیدا یا بساز. */
  private async nazrServiceId(): Promise<string | null> {
    const existing = await this.client.query<{ id: string }>(
      `SELECT id FROM Services WHERE servicename='${NAZR_SERVICE_NAME}' LIMIT 1;`,
    );
    if (existing.length > 0) return existing[0].id;

    const created = await this.client.create<CrmIdResponse>('Services', {
      servicename: NAZR_SERVICE_NAME,
      cf_1642: NAZR_SERVICE_CODE,
      description: 'طرح‌های نذر وب‌سایت نذر امام',
      assigned_user_id: this.crmConfig.config!.assignedUserId,
    });
    this.logger.log(`سرویس CRM ساخته شد: ${NAZR_SERVICE_NAME} → ${created.id}`);
    return created.id;
  }

  private planIntent(nazr: NazrRequestEntity): string | null {
    return PLAN_INTENT_BY_SLUG[nazr.nazrType.slug] ?? null;
  }

  private tomanAmount(amount: { amount: number; currency: 'IRR' | 'IRT' }): number {
    return amount.currency === 'IRR' ? Math.round(amount.amount / 10) : amount.amount;
  }

  /** تاریخ شمسی YYYY-MM-DD برای فیلد تاریخ دریافت در CRM. */
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
