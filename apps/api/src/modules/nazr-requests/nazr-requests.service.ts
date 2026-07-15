import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import type {
  CreateNazrRequest,
  Money,
  NazrRequest,
  NazrType,
  Paginated,
  User,
} from '@nazr-emam/shared';
import { isValidIranMobile, normalizeIranMobile } from '@nazr-emam/shared';
import { NazrRequestEntity } from './entities/nazr-request.entity';
import { NazrTypeEntity } from '../nazr-types/entities/nazr-type.entity';

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
    user: User | null,
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
      userId: user?.id ?? null,
      nazrTypeId: nazrType.id,
      nazrType,
      donorFullName: body.donorFullName,
      donorMobile: body.donorMobile,
      donorNationalCode: body.donorNationalCode,
      amount: body.amount,
      note: body.note,
      isAnonymous: body.isAnonymous ?? false,
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
    user: User | null,
  ): Required<Pick<CreateNazrRequest, 'nazrTypeId' | 'donorFullName' | 'donorMobile' | 'amount'>> &
    Pick<CreateNazrRequest, 'donorNationalCode' | 'note' | 'isAnonymous' | 'isForSelf'> {
    const fields: Record<string, string> = {};
    const nazrTypeId = payload?.nazrTypeId?.trim();
    const isForSelf = payload?.isForSelf !== false;
    const donorFullName = isForSelf ? user?.fullName : payload?.donorFullName?.trim();
    const donorMobile = isForSelf
      ? user?.mobile
      : normalizeIranMobile(payload?.donorMobile ?? '');
    const donorNationalCode = payload?.donorNationalCode?.trim() || null;
    const note = payload?.note?.trim() || null;
    const amount = payload?.amount;

    if (!nazrTypeId) {
      fields.nazrTypeId = 'انتخاب نوع نذر الزامی است';
    }

    if (isForSelf && !user) {
      fields.isForSelf = 'برای ثبت نذر از طرف خودتان باید وارد حساب کاربری شوید';
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
      donorMobile: validatedMobile,
      donorNationalCode,
      amount,
      note,
      isForSelf,
      isAnonymous: Boolean(payload?.isAnonymous),
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

  private async createTrackingCode(): Promise<string> {
    for (let i = 0; i < 5; i += 1) {
      const code = `NE-${Date.now().toString(36).toUpperCase()}-${randomBytes(3)
        .toString('hex')
        .toUpperCase()}`;
      const exists = await this.repo.exists({ where: { trackingCode: code } });
      if (!exists) {
        return code;
      }
    }

    return `NE-${Date.now().toString(36).toUpperCase()}-${randomBytes(6)
      .toString('hex')
      .toUpperCase()}`;
  }
}
