import { galleryAsset } from '../profile/gallery-media';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Client, FTPError } from 'basic-ftp';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Readable } from 'node:stream';
import {
  Brackets,
  DataSource,
  type FindOptionsWhere,
  In,
  IsNull,
  LessThanOrEqual,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import type {
  AdminDashboardSummary,
  AdminNazrTypeSummary,
  AdminNotificationItem,
  AdminPayment,
  AdminEitaaReceipt,
  CallOperator,
  AdminUserDetails,
  AdminUserListItem,
  CallTask,
  CallTaskStatus,
  CreateCallTaskRequest,
  CreateCardPaymentRequest,
  CreateCrmActivityRequest,
  CreateGalleryAssetRequest,
  CreateAdminEitaaReceiptRequest,
  CreateNotificationRequest,
  CreateNazrTypeRequest,
  CrmActivity,
  CrmProfile,
  CrmStage,
  GalleryAsset,
  GalleryAssetPlacement,
  GalleryAssetType,
  GalleryUploadResponse,
  Money,
  NazrRequest,
  NazrRequestStatus,
  NazrType,
  Paginated,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Ticket,
  TicketMessage,
  UpdateCallTaskRequest,
  UpdateCrmProfileRequest,
  UpdateGalleryAssetRequest,
  UpdateNazrTypeRequest,
  User,
} from '@nazr-emam/shared';
import { isValidIranMobile } from '@nazr-emam/shared';
import { UserEntity } from '../auth/entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { NazrRequestEntity } from '../nazr-requests/entities/nazr-request.entity';
import { NazrTypeEntity } from '../nazr-types/entities/nazr-type.entity';
import { NotificationEntity } from '../notifications/entities/notification.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { GalleryAssetEntity } from '../profile/entities/gallery-asset.entity';
import { WalletEntity } from '../profile/entities/wallet.entity';
import { TicketEntity } from '../tickets/entities/ticket.entity';
import { CallTaskEntity } from './entities/call-task.entity';
import { CrmSyncService } from '../../crm/crm-sync.service';
import { CrmActivityEntity } from './entities/crm-activity.entity';
import { CrmProfileEntity } from './entities/crm-profile.entity';
import { EitaaReceiptEntity } from './entities/eitaa-receipt.entity';

/** فیلترها و مرتب‌سازیِ مشترکِ لیست‌های نذر و پرداخت در پنل مدیریت. */
interface AdminListExtras {
  nazrTypeId?: string;
  minAmount?: number;
  maxAmount?: number;
  from?: string;
  to?: string;
  sort?: string;
}

const CRM_STAGES: CrmStage[] = ['new', 'engaged', 'recurring', 'at_risk', 'inactive'];
const CALL_STATUSES: CallTaskStatus[] = ['pending', 'contacted', 'promised', 'paid', 'unreachable', 'cancelled'];
const REQUEST_STATUSES: NazrRequestStatus[] = ['draft', 'submitted', 'awaiting_payment', 'payment_pending_review', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'];
/** نذر «موفق»: پرداختش تأیید شده و وارد اجرا شده است. تلاش‌های ناموفق پرداخت،
 * نذر را cancelled می‌کنند و نباید در شمارش مشارکت بیایند. */
const SUCCESSFUL_REQUEST_STATUSES: NazrRequestStatus[] = ['confirmed', 'in_progress', 'completed'];
const IMAGE_MAX_SIZE = 10 * 1024 * 1024;
const VIDEO_MAX_SIZE = 150 * 1024 * 1024;
const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const VIDEO_MIME_EXTENSIONS: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
};

export interface UploadedGalleryFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

interface ValidatedEitaaReceipt {
  fullName: string;
  mobile: string;
  eitaNumber: string | null;
  nazrTypeId: string;
  amount: Money;
  transactionReference: string | null;
  eitaaMessageUrl: string | null;
  receivedAt: Date;
  note: string | null;
}

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly dataSource: DataSource,
    @InjectRepository(UserEntity) private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(NazrRequestEntity) private readonly requestsRepo: Repository<NazrRequestEntity>,
    @InjectRepository(NazrTypeEntity) private readonly nazrTypesRepo: Repository<NazrTypeEntity>,
    @InjectRepository(PaymentEntity) private readonly paymentsRepo: Repository<PaymentEntity>,
    @InjectRepository(TicketEntity) private readonly ticketsRepo: Repository<TicketEntity>,
    @InjectRepository(NotificationEntity) private readonly notificationsRepo: Repository<NotificationEntity>,
    @InjectRepository(GalleryAssetEntity) private readonly galleryRepo: Repository<GalleryAssetEntity>,
    @InjectRepository(WalletEntity) private readonly walletsRepo: Repository<WalletEntity>,
    @InjectRepository(CrmProfileEntity) private readonly crmRepo: Repository<CrmProfileEntity>,
    @InjectRepository(CrmActivityEntity) private readonly activitiesRepo: Repository<CrmActivityEntity>,
    @InjectRepository(CallTaskEntity) private readonly callTasksRepo: Repository<CallTaskEntity>,
    private readonly crmSync: CrmSyncService,
    @InjectRepository(EitaaReceiptEntity) private readonly eitaaReceiptsRepo: Repository<EitaaReceiptEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    const mobile = this.configService.get<string>('ADMIN_BOOTSTRAP_MOBILE')?.trim();
    const password = this.configService.get<string>('ADMIN_BOOTSTRAP_PASSWORD');
    if (mobile && password) {
      await this.authService.ensureBootstrapAdmin(
        mobile,
        password,
        this.configService.get<string>('ADMIN_BOOTSTRAP_NAME', 'مدیر سامانه'),
      );
    }
  }

  async dashboard(): Promise<AdminDashboardSummary> {
    const [users, totalRequests, pendingRequests, pendingPayments, openTickets, dueCallTasks, paidPayments, recent] = await Promise.all([
      this.usersRepo.count({ where: { role: 'donor' } }),
      this.requestsRepo.count(),
      this.requestsRepo.count({ where: [{ status: 'submitted' }, { status: 'awaiting_payment' }, { status: 'payment_pending_review' }] }),
      this.paymentsRepo.count({ where: { status: 'pending' } }),
      // فقط تیکت‌های بی‌پاسخ؛ تیکتِ پاسخ‌داده‌شده (answered) دیگر در انتظار نیست.
      this.ticketsRepo.count({ where: { status: 'open' } }),
      this.callTasksRepo.count({ where: { status: 'pending', dueDate: LessThanOrEqual(new Date()) } }),
      this.paymentsRepo.find({ where: { status: 'paid' } }),
      this.requestsRepo.find({ relations: { nazrType: true }, order: { createdAt: 'DESC' }, take: 6 }),
    ]);
    return {
      users,
      totalRequests,
      pendingRequests,
      pendingPayments,
      openTickets,
      dueCallTasks,
      paidAmount: this.sumMoney(paidPayments.map((item) => item.amount)),
      recentRequests: recent.map((item) => this.toNazrRequest(item)),
    };
  }

  async users(page = 1, pageSize = 20, search = '', stage?: CrmStage): Promise<Paginated<AdminUserListItem>> {
    const [safePage, safeSize] = this.safePage(page, pageSize);
    const query = this.usersRepo.createQueryBuilder('user')
      .leftJoinAndMapOne('user.crmProfile', CrmProfileEntity, 'crm', 'crm.user_id = user.id')
      .where('user.role = :role', { role: 'donor' });
    if (search.trim()) {
      query.andWhere(new Brackets((builder) => builder
        .where('user.full_name LIKE :search', { search: `%${search.trim()}%` })
        .orWhere('user.mobile LIKE :search', { search: `%${search.trim()}%` })
        .orWhere('user.eita_number LIKE :search', { search: `%${search.trim()}%` })));
    }
    if (stage && CRM_STAGES.includes(stage)) {
      query.andWhere('crm.stage = :stage', { stage });
    }
    const [items, total] = await query.orderBy('user.created_at', 'DESC').skip((safePage - 1) * safeSize).take(safeSize).getManyAndCount();
    return {
      items: await Promise.all(items.map((user) => this.toAdminUser(user, (user as UserEntity & { crmProfile?: CrmProfileEntity }).crmProfile))),
      page: safePage,
      pageSize: safeSize,
      total,
      totalPages: Math.ceil(total / safeSize),
    };
  }

  async userDetails(id: string): Promise<AdminUserDetails> {
    const user = await this.getUser(id);
    const [crm, requests, payments, tickets, activities] = await Promise.all([
      this.ensureCrm(user),
      this.requestsRepo.find({ where: { userId: id }, relations: { nazrType: true }, order: { createdAt: 'DESC' } }),
      this.paymentsRepo.createQueryBuilder('payment').innerJoin('payment.nazrRequest', 'request').where('request.user_id = :id', { id }).orderBy('payment.created_at', 'DESC').getMany(),
      this.ticketsRepo.find({ where: { userId: id }, relations: { messages: true }, order: { updatedAt: 'DESC' } }),
      this.activitiesRepo.find({ where: { userId: id }, order: { createdAt: 'DESC' }, take: 100 }),
    ]);
    return {
      user: await this.toAdminUser(user, crm),
      crm: this.toCrm(crm),
      requests: requests.map((item) => this.toNazrRequest(item)),
      payments: payments.map((item) => this.toPayment(item)),
      tickets: tickets.map((item) => this.toTicket(item)),
      activities: activities.map((item) => this.toActivity(item)),
    };
  }

  async updateCrm(userId: string, payload: UpdateCrmProfileRequest): Promise<CrmProfile> {
    const user = await this.getUser(userId);
    const crm = await this.ensureCrm(user);
    if (payload.stage !== undefined) {
      if (!CRM_STAGES.includes(payload.stage)) this.validation({ stage: 'مرحله CRM معتبر نیست' });
      crm.stage = payload.stage;
    }
    if (payload.tags !== undefined) crm.tags = [...new Set(payload.tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 20);
    if (payload.assignedTo !== undefined) crm.assignedTo = payload.assignedTo?.trim() || null;
    if (payload.note !== undefined) crm.note = payload.note?.trim() || null;
    if (payload.nextFollowUpAt !== undefined) crm.nextFollowUpAt = this.optionalDate(payload.nextFollowUpAt, 'nextFollowUpAt');
    return this.toCrm(await this.crmRepo.save(crm));
  }

  async addActivity(userId: string, payload: CreateCrmActivityRequest, admin: User): Promise<CrmActivity> {
    await this.getUser(userId);
    const summary = payload.summary?.trim();
    if (!summary || summary.length < 2 || summary.length > 2000) this.validation({ summary: 'شرح فعالیت معتبر نیست' });
    if (!['call', 'note', 'payment', 'ticket', 'status'].includes(payload.type)) this.validation({ type: 'نوع فعالیت معتبر نیست' });
    const item = await this.activitiesRepo.save(this.activitiesRepo.create({ userId, type: payload.type, summary, createdBy: admin.fullName }));
    if (payload.type === 'call') {
      const crm = await this.ensureCrm(await this.getUser(userId));
      crm.lastContactAt = new Date();
      await this.crmRepo.save(crm);
    }
    return this.toActivity(item);
  }

  async requests(page = 1, pageSize = 20, search = '', status?: NazrRequestStatus, extra: AdminListExtras = {}): Promise<Paginated<NazrRequest>> {
    const [safePage, safeSize] = this.safePage(page, pageSize);
    const query = this.requestsRepo.createQueryBuilder('request').leftJoinAndSelect('request.nazrType', 'nazrType');
    if (search.trim()) query.andWhere('(request.tracking_code LIKE :search OR request.donor_full_name LIKE :search OR request.donor_mobile LIKE :search)', { search: `%${search.trim()}%` });
    if (status && REQUEST_STATUSES.includes(status)) query.andWhere('request.status = :status', { status });
    if (extra.nazrTypeId) query.andWhere('request.nazr_type_id = :nazrTypeId', { nazrTypeId: extra.nazrTypeId });
    this.applyAmountAndDateFilters(query, 'request', extra);
    this.applyListSort(query, 'request', extra.sort);
    const [items, total] = await query.skip((safePage - 1) * safeSize).take(safeSize).getManyAndCount();
    return { items: items.map((item) => this.toNazrRequest(item)), page: safePage, pageSize: safeSize, total, totalPages: Math.ceil(total / safeSize) };
  }

  /**
   * مبلغ در ستون JSON ذخیره می‌شود؛ برای فیلتر و مرتب‌سازی مقدار عددی آن استخراج
   * می‌شود. همه‌ی مبالغ سامانه با واحد تومان (IRT) ثبت می‌شوند.
   */
  private amountExpression(alias: string): string {
    return `CAST(JSON_EXTRACT(${alias}.amount, '$.amount') AS DECIMAL(18,2))`;
  }

  private applyAmountAndDateFilters(
    query: SelectQueryBuilder<NazrRequestEntity | PaymentEntity>,
    alias: string,
    extra: AdminListExtras,
  ): void {
    const amount = this.amountExpression(alias);
    if (extra.minAmount && extra.minAmount > 0) query.andWhere(`${amount} >= :minAmount`, { minAmount: extra.minAmount });
    if (extra.maxAmount && extra.maxAmount > 0) query.andWhere(`${amount} <= :maxAmount`, { maxAmount: extra.maxAmount });
    const from = extra.from ? new Date(extra.from) : null;
    const to = extra.to ? new Date(extra.to) : null;
    if (from && !Number.isNaN(from.getTime())) query.andWhere(`${alias}.created_at >= :from`, { from });
    if (to && !Number.isNaN(to.getTime())) query.andWhere(`${alias}.created_at <= :to`, { to });
  }

  /** پیش‌فرض همان «جدیدترین اول» است؛ مرتب‌سازی مبلغ فقط وقتی صریحاً خواسته شود. */
  private applyListSort(
    query: SelectQueryBuilder<NazrRequestEntity | PaymentEntity>,
    alias: string,
    sort?: string,
  ): void {
    switch (sort) {
      case 'amount_asc':
      case 'amount_desc':
        // Joined pagination wraps this query in SELECT DISTINCT. TypeORM must
        // order by a selected alias, rather than parse JSON_EXTRACT as a join.
        query
          .addSelect(this.amountExpression(alias), 'admin_sort_amount')
          .orderBy('admin_sort_amount', sort === 'amount_asc' ? 'ASC' : 'DESC')
          .addOrderBy(`${alias}.id`, 'ASC');
        break;
      case 'date_asc':
        query.orderBy(`${alias}.created_at`, 'ASC');
        break;
      default:
        query.orderBy(`${alias}.created_at`, 'DESC');
    }
  }

  async nazrTypes(): Promise<AdminNazrTypeSummary[]> {
    const items = await this.nazrTypesRepo.find({ order: { createdAt: 'DESC' } });
    const paidPayments = await this.paymentsRepo.find({ where: { status: 'paid' }, relations: { nazrRequest: true } });
    const requestRows = await this.requestsRepo
      .createQueryBuilder('request')
      .select('request.nazr_type_id', 'nazrTypeId')
      .addSelect('COUNT(*)', 'count')
      .where('request.status IN (:...statuses)', { statuses: SUCCESSFUL_REQUEST_STATUSES })
      .groupBy('request.nazr_type_id')
      .getRawMany<{ nazrTypeId: string; count: string }>();
    const requestCountByType = new Map(requestRows.map((row) => [row.nazrTypeId, Number(row.count)]));

    const paidByType = new Map<string, Money[]>();
    for (const payment of paidPayments) {
      const typeId = payment.nazrRequest?.nazrTypeId;
      if (!typeId) continue;
      const list = paidByType.get(typeId) ?? [];
      list.push(payment.amount);
      paidByType.set(typeId, list);
    }

    return items.map((item) => {
      const paidList = paidByType.get(item.id) ?? [];
      // مُد: پرتکرارترین مبلغِ واریزی (نرمال‌شده به تومان).
      const counts = new Map<number, number>();
      for (const money of paidList) {
        const toman = money.currency === 'IRT' ? money.amount : Math.round(money.amount / 10);
        counts.set(toman, (counts.get(toman) ?? 0) + 1);
      }
      let topAmountValue = 0;
      let topAmountCount = 0;
      for (const [value, count] of counts) {
        if (count > topAmountCount) {
          topAmountCount = count;
          topAmountValue = value;
        }
      }
      return {
        ...this.toNazrType(item),
        collectedAmount: this.sumMoney(paidList),
        paidCount: paidList.length,
        requestCount: requestCountByType.get(item.id) ?? 0,
        topAmount: topAmountCount > 0 ? { amount: topAmountValue, currency: 'IRT' as const } : null,
        topAmountCount,
      };
    });
  }

  async createNazrType(payload: CreateNazrTypeRequest): Promise<NazrType> {
    const body = this.validateNazrType(payload);
    const exists = await this.nazrTypesRepo.exists({ where: { slug: body.slug } });
    if (exists) throw new BadRequestException({ statusCode: 400, code: 'NAZR_TYPE_SLUG_EXISTS', message: 'این شناسه قبلاً استفاده شده است' });
    return this.toNazrType(await this.nazrTypesRepo.save(this.nazrTypesRepo.create(body)));
  }

  async updateNazrType(id: string, payload: UpdateNazrTypeRequest): Promise<NazrType> {
    const item = await this.nazrTypesRepo.findOne({ where: { id } });
    if (!item) this.notFound('NAZR_TYPE_NOT_FOUND', 'نوع نذر پیدا نشد');
    const body = this.validateNazrType({ slug: payload.slug ?? item!.slug, title: payload.title ?? item!.title, description: payload.description ?? item!.description, suggestedAmount: payload.suggestedAmount !== undefined ? payload.suggestedAmount : item!.suggestedAmount, isActive: payload.isActive ?? item!.isActive });
    if (body.slug !== item!.slug && await this.nazrTypesRepo.exists({ where: { slug: body.slug } })) throw new BadRequestException({ statusCode: 400, code: 'NAZR_TYPE_SLUG_EXISTS', message: 'این شناسه قبلاً استفاده شده است' });
    Object.assign(item!, body);
    return this.toNazrType(await this.nazrTypesRepo.save(item!));
  }

  async deleteNazrType(id: string): Promise<void> {
    const item = await this.nazrTypesRepo.findOne({ where: { id } });
    if (!item) this.notFound('NAZR_TYPE_NOT_FOUND', 'نوع نذر پیدا نشد');
    if (await this.requestsRepo.exists({ where: { nazrTypeId: id } })) {
      throw new ConflictException({
        statusCode: 409,
        code: 'NAZR_TYPE_IN_USE',
        message: 'این طرح دارای نذر ثبت‌شده است؛ به‌جای حذف، آن را غیرفعال کنید',
      });
    }
    await this.nazrTypesRepo.delete(id);
  }

  async updateRequestStatus(id: string, status: NazrRequestStatus, adminNote?: string | null): Promise<NazrRequest> {
    if (!REQUEST_STATUSES.includes(status)) this.validation({ status: 'وضعیت نذر معتبر نیست' });
    const item = await this.requestsRepo.findOne({ where: { id }, relations: { nazrType: true } });
    if (!item) this.notFound('NAZR_REQUEST_NOT_FOUND', 'درخواست نذر پیدا نشد');
    item!.status = status;
    item!.adminNote = adminNote?.trim() || null;
    return this.toNazrRequest(await this.requestsRepo.save(item!));
  }

  async payments(page = 1, pageSize = 20, search = '', status?: PaymentStatus, method?: PaymentMethod, nazrTypeId?: string, extra: AdminListExtras = {}): Promise<Paginated<AdminPayment>> {
    const [safePage, safeSize] = this.safePage(page, pageSize);
    const query = this.paymentsRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.nazrRequest', 'request')
      .leftJoinAndSelect('request.nazrType', 'nazrType');
    if (search.trim()) query.andWhere('(payment.transaction_reference LIKE :search OR request.tracking_code LIKE :search OR request.donor_mobile LIKE :search OR request.donor_full_name LIKE :search)', { search: `%${search.trim()}%` });
    if (status && ['pending', 'paid', 'rejected', 'refunded'].includes(status)) query.andWhere('payment.status = :status', { status });
    if (method && ['online', 'card_to_card', 'cash'].includes(method)) query.andWhere('payment.method = :method', { method });
    if (nazrTypeId) query.andWhere('request.nazr_type_id = :nazrTypeId', { nazrTypeId });
    this.applyAmountAndDateFilters(query, 'payment', extra);
    this.applyListSort(query, 'payment', extra.sort);
    const [items, total] = await query.skip((safePage - 1) * safeSize).take(safeSize).getManyAndCount();
    return { items: items.map((item) => this.toAdminPayment(item)), page: safePage, pageSize: safeSize, total, totalPages: Math.ceil(total / safeSize) };
  }

  /**
   * ثبت دستیِ پرداختِ کارت‌به‌کارت برای یک درخواستِ نذر. کاربر رسید را در ایتا
   * می‌فرستد و مدیر پس از بررسی، پرداخت را اینجا ثبت می‌کند.
   */
  async createCardPayment(requestId: string, payload: CreateCardPaymentRequest): Promise<AdminPayment> {
    const request = await this.requestsRepo.findOne({ where: { id: requestId }, relations: { nazrType: true } });
    if (!request) this.notFound('NAZR_REQUEST_NOT_FOUND', 'درخواست نذر پیدا نشد');

    const amount = payload.amount ?? request!.amount;
    if (!amount || !Number.isFinite(amount.amount) || amount.amount <= 0) {
      this.validation({ amount: 'مبلغ پرداخت معتبر نیست' });
    }

    const payment = await this.paymentsRepo.save(
      this.paymentsRepo.create({
        nazrRequestId: request!.id,
        nazrRequest: request!,
        method: 'card_to_card',
        status: 'paid',
        amount,
        transactionReference: payload.reference?.trim() || null,
        receiptUrl: null,
      }),
    );

    request!.status = 'confirmed';
    if (payload.note?.trim()) request!.adminNote = payload.note.trim();
    await this.requestsRepo.save(request!);

    await this.crmSync.syncByPaymentId(payment.id);

    payment.nazrRequest = request!;
    return this.toAdminPayment(payment);
  }

  async setPaymentStatus(id: string, status: 'paid' | 'rejected', reason?: string): Promise<Payment> {
    const item = await this.paymentsRepo.findOne({ where: { id }, relations: { nazrRequest: true } });
    if (!item) this.notFound('PAYMENT_NOT_FOUND', 'پرداخت پیدا نشد');
    item!.status = status;
    item!.nazrRequest.status = status === 'paid' ? 'confirmed' : 'cancelled';
    if (status === 'rejected' && reason?.trim()) item!.nazrRequest.adminNote = reason.trim();
    await this.requestsRepo.save(item!.nazrRequest);
    const saved = await this.paymentsRepo.save(item!);
    if (status === 'paid') await this.crmSync.syncByPaymentId(saved.id);
    else await this.crmSync.syncNewNazr(item!.nazrRequest.id);
    return this.toPayment(saved);
  }

  async eitaaReceipts(page = 1, pageSize = 20, search = ''): Promise<Paginated<AdminEitaaReceipt>> {
    const [safePage, safeSize] = this.safePage(page, pageSize);
    const query = this.eitaaReceiptsRepo.createQueryBuilder('receipt')
      .leftJoinAndSelect('receipt.user', 'user')
      .leftJoinAndSelect('receipt.nazrRequest', 'request')
      .leftJoinAndSelect('receipt.nazrType', 'nazrType')
      .leftJoinAndSelect('receipt.payment', 'payment');
    if (search.trim()) {
      query.where(new Brackets((builder) => builder
        .where('user.full_name LIKE :search', { search: `%${search.trim()}%` })
        .orWhere('user.mobile LIKE :search', { search: `%${search.trim()}%` })
        .orWhere('receipt.eita_number LIKE :search', { search: `%${search.trim()}%` })
        .orWhere('request.tracking_code LIKE :search', { search: `%${search.trim()}%` })
        .orWhere('payment.transaction_reference LIKE :search', { search: `%${search.trim()}%` })));
    }
    const [items, total] = await query
      .orderBy('receipt.received_at', 'DESC')
      .skip((safePage - 1) * safeSize)
      .take(safeSize)
      .getManyAndCount();
    return {
      items: items.map((item) => this.toEitaaReceipt(item)),
      page: safePage,
      pageSize: safeSize,
      total,
      totalPages: Math.ceil(total / safeSize),
    };
  }

  async createEitaaReceipt(
    payload: CreateAdminEitaaReceiptRequest,
    admin: User,
  ): Promise<AdminEitaaReceipt> {
    const body = this.validateEitaaReceipt(payload);
    const nazrTypeExists = await this.nazrTypesRepo.exists({
      where: { id: body.nazrTypeId, isActive: true },
    });
    if (!nazrTypeExists) this.notFound('NAZR_TYPE_NOT_FOUND', 'طرح نذر فعال پیدا نشد');
    if (body.transactionReference && await this.paymentsRepo.exists({
      where: { transactionReference: body.transactionReference },
    })) {
      throw new ConflictException({
        statusCode: 409,
        code: 'EITAA_RECEIPT_DUPLICATE',
        message: 'این شماره مرجع قبلاً ثبت شده است',
      });
    }
    if (body.eitaaMessageUrl && await this.eitaaReceiptsRepo.exists({
      where: { eitaaMessageUrl: body.eitaaMessageUrl },
    })) {
      throw new ConflictException({
        statusCode: 409,
        code: 'EITAA_RECEIPT_DUPLICATE',
        message: 'این پیام ایتا قبلاً ثبت شده است',
      });
    }
    const user = await this.authService.ensureDonorAccount(
      body.fullName,
      body.mobile,
      body.eitaNumber,
    );

    const receiptId = await this.dataSource.transaction(async (manager) => {
      const nazrTypesRepo = manager.getRepository(NazrTypeEntity);
      const requestsRepo = manager.getRepository(NazrRequestEntity);
      const paymentsRepo = manager.getRepository(PaymentEntity);
      const receiptsRepo = manager.getRepository(EitaaReceiptEntity);
      const nazrType = await nazrTypesRepo.findOne({
        where: { id: body.nazrTypeId, isActive: true },
      });
      if (!nazrType) this.notFound('NAZR_TYPE_NOT_FOUND', 'طرح نذر فعال پیدا نشد');

      if (body.transactionReference && await paymentsRepo.exists({
        where: { transactionReference: body.transactionReference },
      })) {
        throw new ConflictException({
          statusCode: 409,
          code: 'EITAA_RECEIPT_DUPLICATE',
          message: 'این شماره مرجع قبلاً ثبت شده است',
        });
      }
      if (body.eitaaMessageUrl && await receiptsRepo.exists({
        where: { eitaaMessageUrl: body.eitaaMessageUrl },
      })) {
        throw new ConflictException({
          statusCode: 409,
          code: 'EITAA_RECEIPT_DUPLICATE',
          message: 'این پیام ایتا قبلاً ثبت شده است',
        });
      }

      const request = requestsRepo.create({
        trackingCode: await this.createTrackingCode(requestsRepo),
        userId: user.id,
        nazrTypeId: nazrType!.id,
        nazrType: nazrType!,
        donorFullName: body.fullName,
        donorMobile: body.mobile,
        donorNationalCode: null,
        amount: body.amount,
        note: body.note,
        isAnonymous: false,
        status: 'confirmed',
        adminNote: 'ثبت و تأیید از روی رسید ارسالی در ایتا',
        createdAt: body.receivedAt,
      });
      const savedRequest = await requestsRepo.save(request);
      const payment = paymentsRepo.create({
        nazrRequestId: savedRequest.id,
        nazrRequest: savedRequest,
        method: 'card_to_card',
        status: 'paid',
        amount: body.amount,
        transactionReference: body.transactionReference,
        receiptUrl: null,
        createdAt: body.receivedAt,
      });
      const savedPayment = await paymentsRepo.save(payment);
      const receipt = receiptsRepo.create({
        userId: user.id,
        user,
        nazrRequestId: savedRequest.id,
        nazrRequest: savedRequest,
        nazrTypeId: nazrType!.id,
        nazrType: nazrType!,
        paymentId: savedPayment.id,
        payment: savedPayment,
        eitaNumber: body.eitaNumber,
        eitaaMessageUrl: body.eitaaMessageUrl,
        receivedAt: body.receivedAt,
        note: body.note,
        recordedByUserId: admin.id,
        recordedBy: admin.fullName,
      });
      return (await receiptsRepo.save(receipt)).id;
    });

    const item = await this.eitaaReceiptsRepo.findOne({
      where: { id: receiptId },
      relations: { user: true, nazrRequest: true, nazrType: true, payment: true },
    });
    if (!item) this.notFound('EITAA_RECEIPT_NOT_FOUND', 'رسید ایتا پیدا نشد');
    await this.crmSync.syncByPaymentId(item!.paymentId);
    return this.toEitaaReceipt(item!);
  }

  async tickets(page = 1, pageSize = 20): Promise<Paginated<Ticket>> {
    const [safePage, safeSize] = this.safePage(page, pageSize);
    const [items, total] = await this.ticketsRepo.findAndCount({ relations: { messages: true }, order: { updatedAt: 'DESC' }, skip: (safePage - 1) * safeSize, take: safeSize });
    return { items: items.map((item) => this.toTicket(item)), page: safePage, pageSize: safeSize, total, totalPages: Math.ceil(total / safeSize) };
  }

  async ticket(id: string): Promise<Ticket> {
    const item = await this.ticketsRepo.findOne({ where: { id }, relations: { messages: true } });
    if (!item) this.notFound('TICKET_NOT_FOUND', 'تیکت پیدا نشد');
    return this.toTicket(item!);
  }

  async notifications(page = 1, pageSize = 20): Promise<Paginated<AdminNotificationItem>> {
    const [safePage, safeSize] = this.safePage(page, pageSize);
    const [items, total] = await this.notificationsRepo.findAndCount({ relations: { user: true }, order: { createdAt: 'DESC' }, skip: (safePage - 1) * safeSize, take: safeSize });
    return { items: items.map((item) => ({ id: item.id, userId: item.userId, userFullName: item.user?.fullName ?? null, title: item.title, body: item.body, link: item.link, isRead: item.isRead, createdAt: item.createdAt.toISOString() })), page: safePage, pageSize: safeSize, total, totalPages: Math.ceil(total / safeSize) };
  }

  async createNotification(payload: CreateNotificationRequest): Promise<AdminNotificationItem> {
    const title = payload.title?.trim();
    const body = payload.body?.trim();
    if (!title || title.length > 180) this.validation({ title: 'عنوان اعلان معتبر نیست' });
    if (!body || body.length > 4000) this.validation({ body: 'متن اعلان معتبر نیست' });
    if (payload.userId) await this.getUser(payload.userId);
    const item = await this.notificationsRepo.save(this.notificationsRepo.create({ userId: payload.userId ?? null, title, body, link: payload.link?.trim() || null, isRead: false }));
    return { id: item.id, userId: item.userId, userFullName: null, title: item.title, body: item.body, link: item.link, isRead: item.isRead, createdAt: item.createdAt.toISOString() };
  }

  async gallery(): Promise<GalleryAsset[]> {
    const items = await this.galleryRepo.find({ order: { createdAt: 'DESC' } });
    return Promise.all(items.map(item => galleryAsset(item, this.configService)));
  }

  async createGallery(payload: CreateGalleryAssetRequest): Promise<GalleryAsset> {
    const body = this.validateGallery(payload);
    if (body.placement === 'intro') {
      const current = await this.galleryRepo.findOne({
        where: { placement: 'intro' },
        order: { createdAt: 'DESC' },
      });
      if (current) {
        const previousUrls = [current.fileUrl, current.thumbnailUrl];
        Object.assign(current, body);
        const saved = await this.galleryRepo.save(current);
        await Promise.all(
          previousUrls
            .filter((url): url is string => Boolean(url) && ![saved.fileUrl, saved.thumbnailUrl].includes(url))
            .map((url) => this.safeRemoveStoredFile(url)),
        );
        return galleryAsset(saved, this.configService);
      }
    }
    const item = await this.galleryRepo.save(this.galleryRepo.create(body));
    return galleryAsset(item, this.configService);
  }

  async updateGallery(id: string, payload: UpdateGalleryAssetRequest): Promise<GalleryAsset> {
    const item = await this.galleryRepo.findOne({ where: { id } });
    if (!item) this.notFound('GALLERY_ASSET_NOT_FOUND', 'رسانه پیدا نشد');
    const merged = this.validateGallery({
      ...item!,
      ...payload,
    });
    if (merged.placement === 'intro' && await this.galleryRepo.exists({ where: { placement: 'intro' } }) && item!.placement !== 'intro') {
      throw new ConflictException({
        statusCode: 409,
        code: 'INTRO_VIDEO_EXISTS',
        message: 'ویدیوی معرفی قبلاً ثبت شده است؛ معرفی جدید را از فرم آپلود جایگزین کنید',
      });
    }
    const oldUrls = [item!.fileUrl, item!.thumbnailUrl];
    Object.assign(item!, merged);
    const saved = await this.galleryRepo.save(item!);
    for (const url of new Set(oldUrls)) {
      if (url && url !== saved.fileUrl && url !== saved.thumbnailUrl) await this.safeRemoveStoredFile(url);
    }
    return galleryAsset(saved, this.configService);
  }

  async deleteGallery(id: string): Promise<void> {
    const item = await this.galleryRepo.findOne({ where: { id } });
    if (!item) this.notFound('GALLERY_ASSET_NOT_FOUND', 'رسانه پیدا نشد');
    await this.galleryRepo.delete(id);
    await Promise.all([
      this.safeRemoveStoredFile(item!.fileUrl),
      item!.thumbnailUrl ? this.safeRemoveStoredFile(item!.thumbnailUrl) : Promise.resolve(),
    ]);
  }

  async callTasks(page = 1, pageSize = 30, status?: CallTaskStatus, assignee?: string): Promise<Paginated<CallTask>> {
    const [safePage, safeSize] = this.safePage(page, pageSize);
    const where: FindOptionsWhere<CallTaskEntity> = {};
    if (status && CALL_STATUSES.includes(status)) where.status = status;
    if (assignee === 'unassigned') where.assignedTo = IsNull();
    else if (assignee?.trim()) where.assignedTo = assignee.trim();
    const [items, total] = await this.callTasksRepo.findAndCount({ where, relations: { user: true }, order: { dueDate: 'ASC', createdAt: 'DESC' }, skip: (safePage - 1) * safeSize, take: safeSize });
    const operatorMap = await this.callOperatorMap();
    return { items: items.map((item) => this.toCallTask(item, operatorMap)), page: safePage, pageSize: safeSize, total, totalPages: Math.ceil(total / safeSize) };
  }

  async callOperators(): Promise<CallOperator[]> {
    const operators = await this.usersRepo.find({ where: { role: 'admin' }, order: { fullName: 'ASC' } });
    return operators.map(({ id, fullName, mobile }) => ({ id, fullName, mobile }));
  }

  async createCallTask(payload: CreateCallTaskRequest): Promise<CallTask> {
    const user = await this.getUser(payload.userId);
    this.validatePeriod(payload.period);
    const dueDate = this.requiredDate(payload.dueDate, 'dueDate');
    const existing = await this.callTasksRepo.findOne({ where: { userId: user.id, period: payload.period } });
    if (existing) throw new BadRequestException({ statusCode: 400, code: 'CALL_TASK_EXISTS', message: 'برای این مخاطب در این ماه قبلاً پیگیری ساخته شده است' });
    const operator = payload.assignedToUserId !== undefined ? await this.getCallOperator(payload.assignedToUserId) : null;
    const item = await this.callTasksRepo.save(this.callTasksRepo.create({ userId: user.id, user, period: payload.period, dueDate, expectedAmount: payload.expectedAmount ?? null, status: 'pending', assignedTo: operator?.id ?? (payload.assignedTo?.trim() || null), note: payload.note?.trim() || null, outcome: null, contactedAt: null }));
    return this.toCallTask(item, new Map(operator ? [[operator.id, operator]] : []));
  }

  async generateCallTasks(period: string, dueDateValue: string): Promise<{ created: number }> {
    this.validatePeriod(period);
    const dueDate = this.requiredDate(dueDateValue, 'dueDate');

    const wallets = await this.walletsRepo.find({ where: { isMonthlyDeductionEnabled: true }, relations: { user: true } });
    const monthlyNazrs = await this.requestsRepo.find({
      where: [
        { wantsMonthlyFollowUp: true, status: 'confirmed' },
        { wantsMonthlyFollowUp: true, status: 'in_progress' },
        { wantsMonthlyFollowUp: true, status: 'completed' },
      ],
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    const candidates = new Map<string, { user: UserEntity; expectedAmount: Money | null }>();
    for (const wallet of wallets) {
      if (wallet.userId) candidates.set(wallet.userId, { user: wallet.user, expectedAmount: wallet.monthlyDeductionAmount });
    }
    for (const nazr of monthlyNazrs) {
      if (nazr.userId && !candidates.has(nazr.userId)) {
        candidates.set(nazr.userId, { user: nazr.user!, expectedAmount: nazr.amount });
      }
    }

    const existing = await this.callTasksRepo.find({ where: { period, userId: In([...candidates.keys()]) } });
    const existingIds = new Set(existing.map((item) => item.userId));
    const tasks = [...candidates.entries()]
      .filter(([userId]) => !existingIds.has(userId))
      .map(([userId, candidate]) =>
        this.callTasksRepo.create({
          userId,
          user: candidate.user,
          period,
          dueDate,
          expectedAmount: candidate.expectedAmount,
          status: 'pending',
          assignedTo: null,
          note: null,
          outcome: null,
          contactedAt: null,
        }),
      );
    if (tasks.length) await this.callTasksRepo.save(tasks);
    return { created: tasks.length };
  }

  async updateCallTask(id: string, payload: UpdateCallTaskRequest): Promise<CallTask> {
    const item = await this.callTasksRepo.findOne({ where: { id }, relations: { user: true } });
    if (!item) this.notFound('CALL_TASK_NOT_FOUND', 'پیگیری پیدا نشد');
    if (payload.status !== undefined) {
      if (!CALL_STATUSES.includes(payload.status)) this.validation({ status: 'وضعیت پیگیری معتبر نیست' });
      item!.status = payload.status;
      if (['contacted', 'promised', 'paid', 'unreachable'].includes(payload.status)) item!.contactedAt = new Date();
    }
    let operator: UserEntity | null | undefined;
    if (payload.assignedToUserId !== undefined) {
      operator = await this.getCallOperator(payload.assignedToUserId);
      item!.assignedTo = operator?.id ?? null;
    } else if (payload.assignedTo !== undefined) {
      item!.assignedTo = payload.assignedTo?.trim() || null;
    }
    if (payload.note !== undefined) item!.note = payload.note?.trim() || null;
    if (payload.outcome !== undefined) item!.outcome = payload.outcome?.trim() || null;
    if (payload.dueDate !== undefined) item!.dueDate = this.requiredDate(payload.dueDate, 'dueDate');
    const saved = await this.callTasksRepo.save(item!);
    const operatorMap = operator === undefined ? await this.callOperatorMap() : new Map(operator ? [[operator.id, operator]] : []);
    return this.toCallTask(saved, operatorMap);
  }

  private async toAdminUser(user: UserEntity, crmValue?: CrmProfileEntity): Promise<AdminUserListItem> {
    const crm = crmValue ?? await this.ensureCrm(user);
    const [requests, payments] = await Promise.all([
      this.requestsRepo.find({ where: { userId: user.id }, order: { updatedAt: 'DESC' } }),
      this.paymentsRepo.createQueryBuilder('payment').innerJoin('payment.nazrRequest', 'request').where('request.user_id = :id', { id: user.id }).andWhere('payment.status = :status', { status: 'paid' }).getMany(),
    ]);
    return { id: user.id, fullName: user.fullName, mobile: user.mobile, eitaNumber: user.eitaNumber, activePlatforms: user.activePlatforms ?? [], role: user.role, requestCount: requests.filter((item) => SUCCESSFUL_REQUEST_STATUSES.includes(item.status)).length, paidAmount: this.sumMoney(payments.map((item) => item.amount)), motivationalTarget: user.motivationalTarget ?? null, lastActivityAt: (requests[0]?.updatedAt ?? user.createdAt).toISOString(), crmStage: crm.stage, tags: crm.tags ?? [], nextFollowUpAt: crm.nextFollowUpAt?.toISOString() ?? null, createdAt: user.createdAt.toISOString() };
  }

  private async getUser(id: string): Promise<UserEntity> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) this.notFound('USER_NOT_FOUND', 'کاربر پیدا نشد');
    return user!;
  }

  private async ensureCrm(user: UserEntity): Promise<CrmProfileEntity> {
    const existing = await this.crmRepo.findOne({ where: { userId: user.id } });
    return existing ?? this.crmRepo.save(this.crmRepo.create({ userId: user.id, user, stage: 'new', tags: [], assignedTo: null, note: null, nextFollowUpAt: null, lastContactAt: null }));
  }

  private toCrm(item: CrmProfileEntity): CrmProfile {
    return { userId: item.userId, stage: item.stage, tags: item.tags ?? [], assignedTo: item.assignedTo, note: item.note, nextFollowUpAt: item.nextFollowUpAt?.toISOString() ?? null, lastContactAt: item.lastContactAt?.toISOString() ?? null, updatedAt: item.updatedAt.toISOString() };
  }

  private toActivity(item: CrmActivityEntity): CrmActivity {
    return { id: item.id, userId: item.userId, type: item.type, summary: item.summary, createdBy: item.createdBy, createdAt: item.createdAt.toISOString() };
  }

  private toNazrRequest(item: NazrRequestEntity): NazrRequest {
    return { id: item.id, trackingCode: item.trackingCode, userId: item.userId, nazrType: this.toNazrType(item.nazrType), donorFullName: item.donorFullName, donorFirstName: item.donorFirstName, donorLastName: item.donorLastName, donorGender: item.donorGender, donorMobile: item.donorMobile, donorNationalCode: item.donorNationalCode, amount: item.amount, note: item.note, isAnonymous: item.isAnonymous, isMonthlyFixed: item.isMonthlyFixed, wantsMonthlyFollowUp: item.wantsMonthlyFollowUp, status: item.status, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() };
  }

  private toNazrType(item: NazrTypeEntity): NazrType {
    return { id: item.id, slug: item.slug, title: item.title, description: item.description, suggestedAmount: item.suggestedAmount, isActive: item.isActive, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() };
  }

  private toPayment(item: PaymentEntity): Payment {
    return { id: item.id, nazrRequestId: item.nazrRequestId, method: item.method, status: item.status, amount: item.amount, transactionReference: item.transactionReference, receiptUrl: item.receiptUrl, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() };
  }

  private toAdminPayment(item: PaymentEntity): AdminPayment {
    const request = item.nazrRequest ?? null;
    const nazrType = request?.nazrType ?? null;
    return {
      ...this.toPayment(item),
      nazrType: nazrType ? { id: nazrType.id, title: nazrType.title, slug: nazrType.slug } : null,
      trackingCode: request?.trackingCode ?? null,
      donorFullName: request?.donorFullName ?? null,
      donorMobile: request?.donorMobile ?? null,
    };
  }

  private toEitaaReceipt(item: EitaaReceiptEntity): AdminEitaaReceipt {
    return {
      id: item.id,
      userId: item.userId,
      userFullName: item.nazrRequest.donorFullName,
      userMobile: item.nazrRequest.donorMobile,
      eitaNumber: item.eitaNumber,
      nazrRequestId: item.nazrRequestId,
      trackingCode: item.nazrRequest.trackingCode,
      nazrTypeId: item.nazrTypeId,
      nazrTypeTitle: item.nazrType.title,
      paymentId: item.paymentId,
      amount: item.payment.amount,
      transactionReference: item.payment.transactionReference,
      eitaaMessageUrl: item.eitaaMessageUrl,
      receivedAt: item.receivedAt.toISOString(),
      note: item.note,
      requestStatus: item.nazrRequest.status,
      paymentStatus: item.payment.status,
      recordedBy: item.recordedBy,
      createdAt: item.createdAt.toISOString(),
    };
  }

  private toTicket(item: TicketEntity): Ticket {
    return { id: item.id, userId: item.userId, guestMobile: item.guestMobile, subject: item.subject, status: item.status, nazrRequestId: item.nazrRequestId, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString(), messages: [...(item.messages ?? [])].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((message): TicketMessage => ({ id: message.id, body: message.body, authorType: message.authorType, createdAt: message.createdAt.toISOString() })) };
  }

  private toCallTask(item: CallTaskEntity, operators: Map<string, UserEntity>): CallTask {
    const operator = item.assignedTo ? operators.get(item.assignedTo) : undefined;
    const legacyAssignedName = item.assignedTo && !/^[0-9a-f-]{36}$/i.test(item.assignedTo) ? item.assignedTo : null;
    return { id: item.id, userId: item.userId, userFullName: item.user.fullName, userMobile: item.user.mobile, period: item.period, dueDate: item.dueDate.toISOString(), expectedAmount: item.expectedAmount, status: item.status, assignedToUserId: operator?.id ?? null, assignedTo: operator?.fullName ?? legacyAssignedName, note: item.note, outcome: item.outcome, contactedAt: item.contactedAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() };
  }

  private async callOperatorMap(): Promise<Map<string, UserEntity>> {
    const operators = await this.usersRepo.find({ where: { role: 'admin' } });
    return new Map(operators.flatMap((operator) => [[operator.id, operator], [operator.fullName, operator]]));
  }

  private async getCallOperator(id: string | null): Promise<UserEntity | null> {
    if (id === null) return null;
    const operator = await this.usersRepo.findOne({ where: { id, role: 'admin' } });
    if (!operator) this.validation({ assignedToUserId: 'اپراتور انتخاب‌شده معتبر نیست' });
    return operator!;
  }

  private validateGallery(payload: CreateGalleryAssetRequest) {
    const title = payload.title?.trim();
    const fileUrl = payload.fileUrl?.trim();
    const thumbnailUrl = payload.thumbnailUrl?.trim() || null;
    const placement: GalleryAssetPlacement = payload.placement;
    if (!title || title.length > 180) this.validation({ title: 'عنوان رسانه معتبر نیست' });
    if (!fileUrl || !/^https?:\/\//i.test(fileUrl)) this.validation({ fileUrl: 'نشانی فایل معتبر نیست' });
    if (!['image', 'video'].includes(payload.type)) this.validation({ type: 'نوع رسانه معتبر نیست' });
    if (!['intro', 'gallery'].includes(placement)) this.validation({ placement: 'محل نمایش رسانه معتبر نیست' });
    if (thumbnailUrl && !/^https?:\/\//i.test(thumbnailUrl)) this.validation({ thumbnailUrl: 'نشانی تصویر بندانگشتی معتبر نیست' });
    if (payload.type === 'video' && !thumbnailUrl) this.validation({ thumbnailUrl: 'تصویر بندانگشتی ویدئو الزامی است' });
    if (placement === 'intro' && payload.type !== 'video') this.validation({ type: 'رسانه معرفی باید ویدئو باشد' });
    if (payload.collectionTitle != null && typeof payload.collectionTitle !== 'string') {
      this.validation({ collectionTitle: 'نام مجموعه معتبر نیست' });
    }
    const photo = placement === 'gallery' && payload.type === 'image';
    const collectionTitle = photo ? payload.collectionTitle?.normalize('NFC').trim() || null : null;
    if (collectionTitle && (collectionTitle.length > 80 || /[/\\?#\x00-\x1f]/u.test(collectionTitle) || /^\.{1,2}$/.test(collectionTitle))) {
      this.validation({ collectionTitle: 'نام مجموعه باید حداکثر ۸۰ نویسه و بدون نویسه‌های مسیر باشد' });
    }
    if (payload.selectAsCover !== undefined && typeof payload.selectAsCover !== 'boolean') {
      this.validation({ selectAsCover: 'انتخاب جلد معتبر نیست' });
    }
    const cover = photo && payload.selectAsCover === undefined
      ? {}
      : { coverSelectedAt: photo && payload.selectAsCover ? new Date() : null };
    return {
      collectionTitle, ...cover,
      nazrTypeId: placement === 'intro' ? null : payload.nazrTypeId ?? null,
      title, type: payload.type, placement, fileUrl, thumbnailUrl,
    };
  }

  // getOrThrow فقط undefined را رد می‌کند نه رشته‌ی خالی؛ این helper نبود مقدار FTP را
  // زودتر و شفاف اعلام می‌کند تا به‌جای ساخت URLِ خرابِ «/filename» سریع fail شود.
  private ftpPublicBaseUrl(): string {
    const base = this.configService
      .getOrThrow<string>('media.ftp.publicBaseUrl')
      .trim()
      .replace(/\/$/, '');
    if (!base) {
      throw new Error('MEDIA_FTP_PUBLIC_BASE_URL پیکربندی نشده است');
    }
    return base;
  }

  // پاک‌سازی فایلِ پس از تغییر DB نباید کل درخواست را fail کند؛ خطا فقط log می‌شود.
  private async safeRemoveStoredFile(url: string): Promise<void> {
    try {
      const referenced = await this.galleryRepo.exists({ where: [{ fileUrl: url }, { thumbnailUrl: url }] });
      if (!referenced) await this.removeStoredFile(url);
    } catch (error) {
      this.logger.warn(`حذف فایل رسانه ناموفق بود (${url}): ${String(error)}`);
    }
  }

  private async removeStoredFile(url: string): Promise<void> {
    const storage = this.configService.get<'local' | 'ftp'>('media.storage', 'local');
    if (storage === 'ftp') {
      const publicBaseUrl = this.ftpPublicBaseUrl();
      const prefix = `${publicBaseUrl}/`;
      if (!url.startsWith(prefix)) return;

      const filename = decodeURIComponent(url.slice(prefix.length));
      if (!filename || basename(filename) !== filename) return;
      await this.withFtp(async (client) => {
        await client.ensureDir(this.configService.getOrThrow<string>('media.ftp.uploadDir'));
        await client.remove(filename).catch((error: unknown) => {
          if (!(error instanceof FTPError) || error.code !== 550) throw error;
        });
      });
      return;
    }

    const publicBaseUrl = this.configService
      .getOrThrow<string>('media.publicBaseUrl')
      .replace(/\/$/, '');
    const prefix = `${publicBaseUrl}/uploads/`;
    if (!url.startsWith(prefix)) return;

    const filename = decodeURIComponent(url.slice(prefix.length));
    if (!filename || basename(filename) !== filename) return;
    const uploadDir = this.configService.getOrThrow<string>('media.uploadDir');
    await unlink(join(uploadDir, filename)).catch((error: unknown) => {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
    });
  }

  async uploadGallery(
    file: UploadedGalleryFile | undefined,
    kind: GalleryAssetType,
  ): Promise<GalleryUploadResponse> {
    if (!['image', 'video'].includes(kind)) {
      this.validation({ kind: 'نوع فایل باید تصویر یا ویدئو باشد' });
    }
    if (!file) this.validation({ file: 'فایل را انتخاب کنید' });

    const extensions = kind === 'video' ? VIDEO_MIME_EXTENSIONS : IMAGE_MIME_EXTENSIONS;
    const extension = extensions[file!.mimetype];
    if (!extension) {
      this.validation({
        file:
          kind === 'video'
            ? 'فرمت ویدئو باید MP4، WebM یا MOV باشد'
            : 'فرمت تصویر باید JPEG، PNG، WebP، GIF یا AVIF باشد',
      });
    }

    const maxSize = kind === 'video' ? VIDEO_MAX_SIZE : IMAGE_MAX_SIZE;
    if (file!.size > maxSize) {
      this.validation({
        file: kind === 'video' ? 'حجم ویدئو نباید بیشتر از ۱۵۰ مگابایت باشد' : 'حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد',
      });
    }

    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const storage = this.configService.get<'local' | 'ftp'>('media.storage', 'local');

    if (storage === 'ftp') {
      await this.withFtp(async (client) => {
        await client.ensureDir(this.configService.getOrThrow<string>('media.ftp.uploadDir'));
        await client.uploadFrom(Readable.from([file!.buffer]), filename);
      });
      const publicBaseUrl = this.ftpPublicBaseUrl();
      return { url: `${publicBaseUrl}/${filename}` };
    }

    const uploadDir = this.configService.getOrThrow<string>('media.uploadDir');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), file!.buffer, { flag: 'wx' });

    const publicBaseUrl = this.configService
      .getOrThrow<string>('media.publicBaseUrl')
      .replace(/\/$/, '');
    return { url: `${publicBaseUrl}/uploads/${filename}` };
  }

  private async withFtp<T>(action: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client(30_000);
    try {
      await client.access({
        host: this.configService.getOrThrow<string>('media.ftp.host'),
        port: this.configService.get<number>('media.ftp.port', 21),
        user: this.configService.getOrThrow<string>('media.ftp.user'),
        password: this.configService.getOrThrow<string>('media.ftp.password'),
        secure: this.configService.get<boolean>('media.ftp.secure', false),
      });
      return await action(client);
    } finally {
      client.close();
    }
  }

  private validateNazrType(payload: CreateNazrTypeRequest): CreateNazrTypeRequest {
    const slug = payload.slug?.trim().toLowerCase();
    const title = payload.title?.trim();
    const description = payload.description?.trim();
    if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug)) this.validation({ slug: 'شناسه باید انگلیسی و خط‌تیره‌دار باشد' });
    if (!title || title.length < 2 || title.length > 160) this.validation({ title: 'عنوان نوع نذر معتبر نیست' });
    if (!description || description.length < 3 || description.length > 4000) this.validation({ description: 'توضیحات نوع نذر معتبر نیست' });
    if (payload.suggestedAmount && (!Number.isFinite(payload.suggestedAmount.amount) || payload.suggestedAmount.amount <= 0)) this.validation({ suggestedAmount: 'مبلغ پیشنهادی معتبر نیست' });
    return { slug, title, description, suggestedAmount: payload.suggestedAmount ?? null, isActive: payload.isActive ?? true };
  }

  private validateEitaaReceipt(payload: CreateAdminEitaaReceiptRequest): ValidatedEitaaReceipt {
    const fields: Record<string, string> = {};
    const fullName = payload?.fullName?.trim();
    const mobile = payload?.mobile?.trim();
    const eitaNumber = payload?.eitaNumber?.trim() || null;
    const nazrTypeId = payload?.nazrTypeId?.trim();
    const transactionReference = payload?.transactionReference?.trim() || null;
    const eitaaMessageUrl = payload?.eitaaMessageUrl?.trim() || null;
    const note = payload?.note?.trim() || null;
    const amount = payload?.amount;
    const receivedAt = payload?.receivedAt
      ? this.requiredDate(payload.receivedAt, 'receivedAt')
      : new Date();

    if (!fullName || fullName.length < 2 || fullName.length > 160) fields.fullName = 'نام و نام خانوادگی معتبر نیست';
    if (!isValidIranMobile(mobile)) fields.mobile = 'شماره موبایل معتبر نیست';
    if (eitaNumber && eitaNumber.length > 40) fields.eitaNumber = 'شماره ایتا نباید بیشتر از ۴۰ کاراکتر باشد';
    if (!nazrTypeId) fields.nazrTypeId = 'انتخاب طرح نذر الزامی است';
    if (!amount || !Number.isSafeInteger(amount.amount) || amount.amount <= 0 || !['IRT', 'IRR'].includes(amount.currency)) fields.amount = 'مبلغ نذر معتبر نیست';
    if (transactionReference && transactionReference.length > 180) fields.transactionReference = 'شماره مرجع نباید بیشتر از ۱۸۰ کاراکتر باشد';
    if (eitaaMessageUrl) {
      try {
        const url = new URL(eitaaMessageUrl);
        if (url.protocol !== 'https:' || !['eitaa.com', 'www.eitaa.com'].includes(url.hostname)) throw new Error('invalid');
      } catch {
        fields.eitaaMessageUrl = 'لینک پیام باید از دامنه eitaa.com باشد';
      }
    }
    if (receivedAt.getTime() > Date.now() + 5 * 60 * 1000) fields.receivedAt = 'تاریخ دریافت نمی‌تواند در آینده باشد';
    if (note && note.length > 1000) fields.note = 'یادداشت نباید بیشتر از ۱۰۰۰ کاراکتر باشد';
    if (Object.keys(fields).length) this.validation(fields);

    return {
      fullName: fullName ?? '',
      mobile: mobile ?? '',
      eitaNumber,
      nazrTypeId: nazrTypeId ?? '',
      amount: amount!,
      transactionReference,
      eitaaMessageUrl,
      receivedAt,
      note,
    };
  }

  private async createTrackingCode(repo: Repository<NazrRequestEntity>): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase();
      const code = `NE-${Date.now().toString(36).toUpperCase()}-${suffix}`;
      if (!await repo.exists({ where: { trackingCode: code } })) return code;
    }
    return `NE-${Date.now().toString(36).toUpperCase()}-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  }

  private sumMoney(items: Money[]): Money {
    return { amount: items.reduce((sum, item) => sum + (item.currency === 'IRT' ? item.amount : item.amount / 10), 0), currency: 'IRT' };
  }

  private safePage(page: number, pageSize: number): [number, number] {
    return [Math.max(1, Number(page) || 1), Math.min(100, Math.max(1, Number(pageSize) || 20))];
  }

  private optionalDate(value: string | null, field: string): Date | null {
    return value ? this.requiredDate(value, field) : null;
  }

  private requiredDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) this.validation({ [field]: 'تاریخ معتبر نیست' });
    return date;
  }

  private validatePeriod(period: string): void {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) this.validation({ period: 'دوره باید با قالب YYYY-MM باشد' });
  }

  private validation(fields: Record<string, string>): never {
    throw new BadRequestException({ statusCode: 400, code: 'VALIDATION_ERROR', message: 'ورودی نامعتبر است', fields });
  }

  private notFound(code: string, message: string): never {
    throw new NotFoundException({ statusCode: 404, code, message });
  }
}
