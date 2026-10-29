import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'node:crypto';
import { Repository } from 'typeorm';
import type {
  CreateNazrRequest,
  Money,
  NazrRequest,
  NazrType,
  Paginated,
  User,
} from '@nazr-emam/shared';
import { isValidIranMobile } from '@nazr-emam/shared';
import { NazrRequestEntity } from './entities/nazr-request.entity';
import { NazrTypeEntity } from '../nazr-types/entities/nazr-type.entity';

interface ValidatedCreateNazrRequest {
  nazrTypeId: string;
  donorFullName: string;
  donorFirstName: string | null;
  donorLastName: string | null;
  donorGender: 'male' | 'female' | null;
  donorMobile: string;
  donorNationalCode: string | null;
  amount: Money;
  note: string | null;
  isAnonymous: boolean;
  isMonthlyFixed: boolean;
  wantsMonthlyFollowUp: boolean;
}

/**
 * الفبای کد رهگیری: بدون کاراکترهای مبهم (0/O و 1/I/L و U) تا هنگام خواندن،
 * گفتن در تماس تلفنی یا تایپ‌کردن اشتباه نشود.
 */
const TRACKING_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

@Injectable()
export class NazrRequestsService {
  constructor(
    @InjectRepository(NazrRequestEntity)
    private readonly repo: Repository<NazrRequestEntity>,
    @InjectRepository(NazrTypeEntity)
    private readonly nazrTypesRepo: Repository<NazrTypeEntity>,
  ) {}

  async create(
    payload: CreateNazrRequest,
    user: User,
  ): Promise<NazrRequest> {
    const body = this.validateCreate(payload, user);
    const nazrType = await this.nazrTypesRepo.findOne({
      where: { id: body.nazrTypeId, isActive: true },
    });

    if (!nazrType) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'NAZR_TYPE_NOT_FOUND',
        message: 'نوع نذر انتخاب‌شده پیدا نشد',
      });
    }

    const request = this.repo.create({
      trackingCode: await this.createTrackingCode(),
      userId: user.id,
      nazrTypeId: nazrType.id,
      nazrType,
      donorFullName: body.donorFullName,
      donorFirstName: body.donorFirstName,
      donorLastName: body.donorLastName,
      donorGender: body.donorGender,
      donorMobile: body.donorMobile,
      donorNationalCode: body.donorNationalCode,
      amount: body.amount,
      note: body.note,
      isAnonymous: body.isAnonymous,
      isMonthlyFixed: body.isMonthlyFixed,
      wantsMonthlyFollowUp: body.wantsMonthlyFollowUp,
      status: 'awaiting_payment',
      adminNote: null,
    });

    return this.toDto(await this.repo.save(request));
  }

  async getMine(
    userId: string,
    page = 1,
    pageSize = 12,
  ): Promise<Paginated<NazrRequest>> {
    const [items, total] = await this.repo.findAndCount({
      where: { userId },
      relations: { nazrType: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: items.map((r) => this.toDto(r)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private toDto(r: NazrRequestEntity): NazrRequest {
    return {
      id: r.id,
      trackingCode: r.trackingCode,
      userId: r.userId,
      nazrType: this.toNazrTypeDto(r.nazrType),
      donorFullName: r.donorFullName,
      donorFirstName: r.donorFirstName,
      donorLastName: r.donorLastName,
      donorGender: r.donorGender,
      isMonthlyFixed: r.isMonthlyFixed,
      wantsMonthlyFollowUp: r.wantsMonthlyFollowUp,
      donorMobile: r.donorMobile,
      donorNationalCode: r.donorNationalCode,
      amount: r.amount,
      note: r.note,
      isAnonymous: r.isAnonymous,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private toNazrTypeDto(t: NazrTypeEntity): NazrType {
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      description: t.description,
      suggestedAmount: t.suggestedAmount,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  private validateCreate(
    payload: CreateNazrRequest,
    user: User,
  ): ValidatedCreateNazrRequest {
    const fields: Record<string, string> = {};
    const nazrTypeId = payload?.nazrTypeId?.trim();
    const donorFirstName = payload?.donorFirstName?.trim() || null;
    const donorLastName = payload?.donorLastName?.trim() || null;
    const donorGender =
      payload?.donorGender === 'male' || payload?.donorGender === 'female'
        ? payload.donorGender
        : null;
    const donorFullName =
      donorFirstName && donorLastName
        ? `${donorFirstName} ${donorLastName}`
        : user.fullName;
    const donorMobile = user.mobile;
    const donorNationalCode = payload?.donorNationalCode?.trim() || null;
    const note = payload?.note?.trim() || null;
    const amount = payload?.amount;

    if (!nazrTypeId) {
      fields.nazrTypeId = 'انتخاب نوع نذر الزامی است';
    }

    if (!donorFirstName || donorFirstName.length < 2) {
      fields.donorFirstName = 'نام معتبر نیست';
    }

    if (!donorLastName || donorLastName.length < 2) {
      fields.donorLastName = 'نام خانوادگی معتبر نیست';
    }

    if (!donorGender) {
      fields.donorGender = 'انتخاب جنسیت الزامی است';
    }

    if (!donorFullName || donorFullName.length < 2) {
      fields.donorFullName = 'نام و نام خانوادگی معتبر نیست';
    }

    if (!isValidIranMobile(donorMobile)) {
      fields.donorMobile = 'شماره موبایل معتبر نیست';
    }

    if (donorNationalCode && !/^\d{10}$/.test(donorNationalCode)) {
      fields.donorNationalCode = 'کد ملی باید ۱۰ رقم باشد';
    }

    if (!this.isValidAmount(amount)) {
      fields.amount = 'مبلغ نذر معتبر نیست';
    }

    if (note && note.length > 1000) {
      fields.note = 'یادداشت نباید بیشتر از ۱۰۰۰ کاراکتر باشد';
    }

    this.throwValidation(fields);

    const validatedFullName = donorFullName ?? '';
    const validatedMobile = donorMobile ?? '';

    return {
      nazrTypeId,
      donorFullName: validatedFullName,
      donorFirstName,
      donorLastName,
      donorGender,
      donorMobile: validatedMobile,
      donorNationalCode,
      amount,
      note,
      isAnonymous: Boolean(payload?.isAnonymous),
      isMonthlyFixed: Boolean(payload?.isMonthlyFixed),
      wantsMonthlyFollowUp: Boolean(payload?.wantsMonthlyFollowUp),
    };
  }

  private isValidAmount(amount?: Money): amount is Money {
    return (
      Boolean(amount) &&
      Number.isFinite(amount!.amount) &&
      amount!.amount > 0 &&
      ['IRR', 'IRT'].includes(amount!.currency)
    );
  }

  private throwValidation(fields: Record<string, string>): void {
    if (Object.keys(fields).length === 0) {
      return;
    }

    throw new BadRequestException({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'ورودی نامعتبر است',
      fields,
    });
  }

  private randomTrackingCode(length: number): string {
    let code = '';
    for (let i = 0; i < length; i += 1) {
      code += TRACKING_ALPHABET[randomInt(TRACKING_ALPHABET.length)];
    }
    return `NE-${code}`;
  }

  private async createTrackingCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      // بعد از چند برخوردِ پیاپی، طول را زیاد می‌کنیم تا تکرار عملاً غیرممکن شود.
      const code = this.randomTrackingCode(attempt < 5 ? 6 : 8);
      const exists = await this.repo.exists({ where: { trackingCode: code } });
      if (!exists) {
        return code;
      }
    }

    return this.randomTrackingCode(10);
  }
}
