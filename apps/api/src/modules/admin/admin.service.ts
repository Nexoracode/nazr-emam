import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  In,
  IsNull,
  LessThanOrEqual,
  Repository,
} from 'typeorm';
import type {
  AdminDashboardSummary,
  AdminNotificationItem,
  AdminUserDetails,
  AdminUserListItem,
  CallTask,
  CallTaskStatus,
  CreateCallTaskRequest,
  CreateCrmActivityRequest,
  CreateGalleryAssetRequest,
  CreateNotificationRequest,
  CreateNazrTypeRequest,
  CrmActivity,
  CrmProfile,
  CrmStage,
  GalleryAsset,
  Money,
  NazrRequest,
  NazrRequestStatus,
  NazrType,
  Paginated,
  Payment,
  PaymentStatus,
  Ticket,
  TicketMessage,
  UpdateCallTaskRequest,
  UpdateCrmProfileRequest,
  UpdateGalleryAssetRequest,
  UpdateNazrTypeRequest,
  User,
} from '@nazr-emam/shared';
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
import { CrmActivityEntity } from './entities/crm-activity.entity';
import { CrmProfileEntity } from './entities/crm-profile.entity';

const CRM_STAGES: CrmStage[] = ['new', 'engaged', 'recurring', 'at_risk', 'inactive'];
const CALL_STATUSES: CallTaskStatus[] = ['pending', 'contacted', 'promised', 'paid', 'unreachable', 'cancelled'];
const REQUEST_STATUSES: NazrRequestStatus[] = ['draft', 'submitted', 'awaiting_payment', 'payment_pending_review', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'];

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
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
      this.ticketsRepo.count({ where: [{ status: 'open' }, { status: 'answered' }] }),
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

  async requests(page = 1, pageSize = 20, search = '', status?: NazrRequestStatus): Promise<Paginated<NazrRequest>> {
    const [safePage, safeSize] = this.safePage(page, pageSize);
    const query = this.requestsRepo.createQueryBuilder('request').leftJoinAndSelect('request.nazrType', 'nazrType');
    if (search.trim()) query.where('(request.tracking_code LIKE :search OR request.donor_full_name LIKE :search OR request.donor_mobile LIKE :search)', { search: `%${search.trim()}%` });
    if (status && REQUEST_STATUSES.includes(status)) query.andWhere('request.status = :status', { status });
    const [items, total] = await query.orderBy('request.created_at', 'DESC').skip((safePage - 1) * safeSize).take(safeSize).getManyAndCount();
    return { items: items.map((item) => this.toNazrRequest(item)), page: safePage, pageSize: safeSize, total, totalPages: Math.ceil(total / safeSize) };
  }

  async nazrTypes(): Promise<NazrType[]> {
    const items = await this.nazrTypesRepo.find({ order: { createdAt: 'DESC' } });
    return items.map((item) => this.toNazrType(item));
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

  async payments(page = 1, pageSize = 20, search = '', status?: PaymentStatus): Promise<Paginated<Payment>> {
    const [safePage, safeSize] = this.safePage(page, pageSize);
    const query = this.paymentsRepo.createQueryBuilder('payment').leftJoinAndSelect('payment.nazrRequest', 'request');
    if (search.trim()) query.where('(payment.transaction_reference LIKE :search OR request.tracking_code LIKE :search OR request.donor_mobile LIKE :search)', { search: `%${search.trim()}%` });
    if (status && ['pending', 'paid', 'rejected', 'refunded'].includes(status)) query.andWhere('payment.status = :status', { status });
    const [items, total] = await query.orderBy('payment.created_at', 'DESC').skip((safePage - 1) * safeSize).take(safeSize).getManyAndCount();
    return { items: items.map((item) => this.toPayment(item)), page: safePage, pageSize: safeSize, total, totalPages: Math.ceil(total / safeSize) };
  }

  async setPaymentStatus(id: string, status: 'paid' | 'rejected', reason?: string): Promise<Payment> {
    const item = await this.paymentsRepo.findOne({ where: { id }, relations: { nazrRequest: true } });
    if (!item) this.notFound('PAYMENT_NOT_FOUND', 'پرداخت پیدا نشد');
    item!.status = status;
    item!.nazrRequest.status = status === 'paid' ? 'confirmed' : 'cancelled';
    if (status === 'rejected' && reason?.trim()) item!.nazrRequest.adminNote = reason.trim();
    await this.requestsRepo.save(item!.nazrRequest);
    return this.toPayment(await this.paymentsRepo.save(item!));
  }

  async tickets(page = 1, pageSize = 20): Promise<Paginated<Ticket>> {
    const [safePage, safeSize] = this.safePage(page, pageSize);
    const [items, total] = await this.ticketsRepo.findAndCount({ relations: { messages: true }, order: { updatedAt: 'DESC' }, skip: (safePage - 1) * safeSize, take: safeSize });
    return { items: items.map((item) => this.toTicket(item)), page: safePage, pageSize: safeSize, total, totalPages: Math.ceil(total / safeSize) };
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
    return items.map((item) => this.toGallery(item));
  }

  async createGallery(payload: CreateGalleryAssetRequest): Promise<GalleryAsset> {
    const body = this.validateGallery(payload);
    const item = await this.galleryRepo.save(this.galleryRepo.create(body));
    return this.toGallery(item);
  }

  async updateGallery(id: string, payload: UpdateGalleryAssetRequest): Promise<GalleryAsset> {
    const item = await this.galleryRepo.findOne({ where: { id } });
    if (!item) this.notFound('GALLERY_ASSET_NOT_FOUND', 'رسانه پیدا نشد');
    const merged = this.validateGallery({ nazrTypeId: payload.nazrTypeId !== undefined ? payload.nazrTypeId : item!.nazrTypeId, title: payload.title ?? item!.title, type: payload.type ?? item!.type, fileUrl: payload.fileUrl ?? item!.fileUrl, thumbnailUrl: payload.thumbnailUrl !== undefined ? payload.thumbnailUrl : item!.thumbnailUrl });
    Object.assign(item!, merged);
    return this.toGallery(await this.galleryRepo.save(item!));
  }

  async deleteGallery(id: string): Promise<void> {
    const result = await this.galleryRepo.delete(id);
    if (!result.affected) this.notFound('GALLERY_ASSET_NOT_FOUND', 'رسانه پیدا نشد');
  }

  async callTasks(page = 1, pageSize = 30, status?: CallTaskStatus): Promise<Paginated<CallTask>> {
    const [safePage, safeSize] = this.safePage(page, pageSize);
    const where = status && CALL_STATUSES.includes(status) ? { status } : {};
    const [items, total] = await this.callTasksRepo.findAndCount({ where, relations: { user: true }, order: { dueDate: 'ASC', createdAt: 'DESC' }, skip: (safePage - 1) * safeSize, take: safeSize });
    return { items: items.map((item) => this.toCallTask(item)), page: safePage, pageSize: safeSize, total, totalPages: Math.ceil(total / safeSize) };
  }

  async createCallTask(payload: CreateCallTaskRequest): Promise<CallTask> {
    const user = await this.getUser(payload.userId);
    this.validatePeriod(payload.period);
    const dueDate = this.requiredDate(payload.dueDate, 'dueDate');
    const existing = await this.callTasksRepo.findOne({ where: { userId: user.id, period: payload.period } });
    if (existing) throw new BadRequestException({ statusCode: 400, code: 'CALL_TASK_EXISTS', message: 'برای این مخاطب در این ماه قبلاً پیگیری ساخته شده است' });
    const item = await this.callTasksRepo.save(this.callTasksRepo.create({ userId: user.id, user, period: payload.period, dueDate, expectedAmount: payload.expectedAmount ?? null, status: 'pending', assignedTo: payload.assignedTo?.trim() || null, note: payload.note?.trim() || null, outcome: null, contactedAt: null }));
    return this.toCallTask(item);
  }

  async generateCallTasks(period: string, dueDateValue: string): Promise<{ created: number }> {
    this.validatePeriod(period);
    const dueDate = this.requiredDate(dueDateValue, 'dueDate');
    const wallets = await this.walletsRepo.find({ where: { isMonthlyDeductionEnabled: true }, relations: { user: true } });
    const existing = await this.callTasksRepo.find({ where: { period, userId: In(wallets.map((wallet) => wallet.userId)) } });
    const existingIds = new Set(existing.map((item) => item.userId));
    const tasks = wallets.filter((wallet) => !existingIds.has(wallet.userId)).map((wallet) => this.callTasksRepo.create({ userId: wallet.userId, user: wallet.user, period, dueDate, expectedAmount: wallet.monthlyDeductionAmount, status: 'pending', assignedTo: null, note: null, outcome: null, contactedAt: null }));
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
    if (payload.assignedTo !== undefined) item!.assignedTo = payload.assignedTo?.trim() || null;
    if (payload.note !== undefined) item!.note = payload.note?.trim() || null;
    if (payload.outcome !== undefined) item!.outcome = payload.outcome?.trim() || null;
    if (payload.dueDate !== undefined) item!.dueDate = this.requiredDate(payload.dueDate, 'dueDate');
    return this.toCallTask(await this.callTasksRepo.save(item!));
  }

  private async toAdminUser(user: UserEntity, crmValue?: CrmProfileEntity): Promise<AdminUserListItem> {
    const crm = crmValue ?? await this.ensureCrm(user);
    const [requests, payments] = await Promise.all([
      this.requestsRepo.find({ where: { userId: user.id }, order: { updatedAt: 'DESC' } }),
      this.paymentsRepo.createQueryBuilder('payment').innerJoin('payment.nazrRequest', 'request').where('request.user_id = :id', { id: user.id }).andWhere('payment.status = :status', { status: 'paid' }).getMany(),
    ]);
    return { id: user.id, fullName: user.fullName, mobile: user.mobile, eitaNumber: user.eitaNumber, activePlatforms: user.activePlatforms ?? [], role: user.role, requestCount: requests.length, paidAmount: this.sumMoney(payments.map((item) => item.amount)), lastActivityAt: (requests[0]?.updatedAt ?? user.createdAt).toISOString(), crmStage: crm.stage, tags: crm.tags ?? [], nextFollowUpAt: crm.nextFollowUpAt?.toISOString() ?? null, createdAt: user.createdAt.toISOString() };
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
    return { id: item.id, trackingCode: item.trackingCode, userId: item.userId, nazrType: this.toNazrType(item.nazrType), donorFullName: item.donorFullName, donorMobile: item.donorMobile, donorNationalCode: item.donorNationalCode, amount: item.amount, note: item.note, isAnonymous: item.isAnonymous, status: item.status, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() };
  }

  private toNazrType(item: NazrTypeEntity): NazrType {
    return { id: item.id, slug: item.slug, title: item.title, description: item.description, suggestedAmount: item.suggestedAmount, isActive: item.isActive, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() };
  }

  private toPayment(item: PaymentEntity): Payment {
    return { id: item.id, nazrRequestId: item.nazrRequestId, method: item.method, status: item.status, amount: item.amount, transactionReference: item.transactionReference, receiptUrl: item.receiptUrl, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() };
  }

  private toTicket(item: TicketEntity): Ticket {
    return { id: item.id, userId: item.userId, guestMobile: item.guestMobile, subject: item.subject, status: item.status, nazrRequestId: item.nazrRequestId, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString(), messages: [...(item.messages ?? [])].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((message): TicketMessage => ({ id: message.id, body: message.body, authorType: message.authorType, createdAt: message.createdAt.toISOString() })) };
  }

  private toGallery(item: GalleryAssetEntity): GalleryAsset {
    return { id: item.id, nazrTypeId: item.nazrTypeId, title: item.title, type: item.type, fileUrl: item.fileUrl, thumbnailUrl: item.thumbnailUrl, createdAt: item.createdAt.toISOString() };
  }

  private toCallTask(item: CallTaskEntity): CallTask {
    return { id: item.id, userId: item.userId, userFullName: item.user.fullName, userMobile: item.user.mobile, period: item.period, dueDate: item.dueDate.toISOString(), expectedAmount: item.expectedAmount, status: item.status, assignedTo: item.assignedTo, note: item.note, outcome: item.outcome, contactedAt: item.contactedAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() };
  }

  private validateGallery(payload: CreateGalleryAssetRequest) {
    const title = payload.title?.trim();
    const fileUrl = payload.fileUrl?.trim();
    if (!title || title.length > 180) this.validation({ title: 'عنوان رسانه معتبر نیست' });
    if (!fileUrl || !/^https?:\/\//i.test(fileUrl)) this.validation({ fileUrl: 'نشانی فایل معتبر نیست' });
    if (!['image', 'video'].includes(payload.type)) this.validation({ type: 'نوع رسانه معتبر نیست' });
    return { nazrTypeId: payload.nazrTypeId ?? null, title, type: payload.type, fileUrl, thumbnailUrl: payload.thumbnailUrl?.trim() || null };
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
