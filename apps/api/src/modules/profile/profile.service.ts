import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import type {
  CreateInvitationCardRequest,
  CreateWalletChargeRequest,
  GalleryAsset,
  InvitationCard,
  Money,
  Paginated,
  Payment,
  UpdateMotivationalTargetRequest,
  UpdateUserProfileDetailsRequest,
  UpdateWalletSettingsRequest,
  UserClubStatus,
  UserContributionSummary,
  UserMission,
  UserPaymentHistoryQuery,
  UserPlatform,
  UserProfileDetails,
  UserProfileSummary,
  Wallet,
  WalletTransaction,
} from '@nazr-emam/shared';
import { isValidIranMobile } from '@nazr-emam/shared';
import { UserEntity } from '../auth/entities/user.entity';
import { NazrRequestEntity } from '../nazr-requests/entities/nazr-request.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { NotificationEntity } from '../notifications/entities/notification.entity';
import { TicketEntity } from '../tickets/entities/ticket.entity';
import { GalleryAssetEntity } from './entities/gallery-asset.entity';
import { InvitationCardEntity } from './entities/invitation-card.entity';
import { WalletTransactionEntity } from './entities/wallet-transaction.entity';
import { WalletEntity } from './entities/wallet.entity';

const SUPPORTED_PLATFORMS: UserPlatform[] = [
  'eitaa',
  'instagram',
  'telegram',
  'whatsapp',
  'website',
  'other',
];

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(NazrRequestEntity)
    private readonly nazrRequestsRepo: Repository<NazrRequestEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepo: Repository<PaymentEntity>,
    @InjectRepository(NotificationEntity)
    private readonly notificationsRepo: Repository<NotificationEntity>,
    @InjectRepository(TicketEntity)
    private readonly ticketsRepo: Repository<TicketEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletsRepo: Repository<WalletEntity>,
    @InjectRepository(WalletTransactionEntity)
    private readonly walletTransactionsRepo: Repository<WalletTransactionEntity>,
    @InjectRepository(GalleryAssetEntity)
    private readonly galleryRepo: Repository<GalleryAssetEntity>,
    @InjectRepository(InvitationCardEntity)
    private readonly invitationCardsRepo: Repository<InvitationCardEntity>,
  ) {}

  async getDetails(userId: string): Promise<UserProfileDetails> {
    return this.toProfileDetails(await this.getUserOrFail(userId));
  }

  async updateDetails(
    userId: string,
    payload: UpdateUserProfileDetailsRequest,
  ): Promise<UserProfileDetails> {
    const user = await this.getUserOrFail(userId);
    const fields: Record<string, string> = {};

    if (payload.fullName !== undefined) {
      const fullName = payload.fullName.trim();
      if (fullName.length < 2 || fullName.length > 160) {
        fields.fullName = 'نام و نام خانوادگی معتبر نیست';
      } else {
        user.fullName = fullName;
      }
    }

    if (payload.mobile !== undefined) {
      const mobile = payload.mobile.trim();
      if (!isValidIranMobile(mobile)) {
        fields.mobile = 'شماره همراه معتبر نیست';
      } else if (mobile !== user.mobile) {
        const exists = await this.usersRepo.exists({ where: { mobile } });
        if (exists) {
          throw new ConflictException({
            statusCode: 409,
            code: 'MOBILE_TAKEN',
            message: 'این شماره همراه قبلاً ثبت شده است',
          });
        }
        user.mobile = mobile;
      }
    }

    if (payload.eitaNumber !== undefined) {
      const eitaNumber = payload.eitaNumber?.trim() || null;
      if (eitaNumber && eitaNumber.length > 40) {
        fields.eitaNumber = 'شماره ایتا نباید بیشتر از ۴۰ کاراکتر باشد';
      } else {
        user.eitaNumber = eitaNumber;
      }
    }

    if (payload.activePlatforms !== undefined) {
      const platforms = Array.from(new Set(payload.activePlatforms));
      const invalid = platforms.find(
        (platform) => !SUPPORTED_PLATFORMS.includes(platform),
      );
      if (invalid) {
        fields.activePlatforms = 'پلتفرم انتخاب‌شده معتبر نیست';
      } else {
        user.activePlatforms = platforms;
      }
    }

    this.throwValidation(fields);
    return this.toProfileDetails(await this.usersRepo.save(user));
  }

  async getGoal(userId: string): Promise<{ motivationalTarget: string | null }> {
    const user = await this.getUserOrFail(userId);
    return { motivationalTarget: user.motivationalTarget };
  }

  async updateGoal(
    userId: string,
    payload: UpdateMotivationalTargetRequest,
  ): Promise<{ motivationalTarget: string | null }> {
    const user = await this.getUserOrFail(userId);
    const target = payload.motivationalTarget?.trim() || null;
    if (target && target.length > 500) {
      this.throwValidation({
        motivationalTarget: 'هدف شخصی نباید بیشتر از ۵۰۰ کاراکتر باشد',
      });
    }
    user.motivationalTarget = target;
    await this.usersRepo.save(user);
    return { motivationalTarget: user.motivationalTarget };
  }

  async getSummary(userId: string): Promise<UserProfileSummary> {
    const [profile, contributions, payments, club, unreadNotifications, openTickets] =
      await Promise.all([
        this.getDetails(userId),
        this.getContributions(userId),
        this.getPayments(userId, { page: 1, pageSize: 5 }),
        this.getClub(userId),
        this.notificationsRepo.count({
          where: [
            { userId, isRead: false },
            { userId: IsNull(), isRead: false },
          ],
        }),
        this.ticketsRepo.count({ where: { userId, status: 'open' } }),
      ]);

    return {
      profile,
      contributions,
      payments: {
        totalPaidAmount: this.sumMoney(payments.items.map((p) => p.amount)),
        totalPayments: payments.total,
        recentPayments: payments.items,
      },
      club,
      unreadNotifications,
      openTickets,
    };
  }

  async getContributions(userId: string): Promise<UserContributionSummary> {
    const items = await this.nazrRequestsRepo.find({
      where: { userId },
      relations: { nazrType: true },
      order: { createdAt: 'DESC' },
    });
    const totalAmount = this.sumMoney(items.map((item) => item.amount));
    const byType = new Map<
      string,
      { nazrTypeId: string; title: string; count: number; totalAmount: Money }
    >();

    for (const item of items) {
      const current =
        byType.get(item.nazrTypeId) ??
        {
          nazrTypeId: item.nazrTypeId,
          title: item.nazrType?.title ?? 'طرح نذر',
          count: 0,
          totalAmount: { amount: 0, currency: item.amount.currency },
        };
      current.count += 1;
      current.totalAmount = this.addMoney(current.totalAmount, item.amount);
      byType.set(item.nazrTypeId, current);
    }

    return {
      totalRequests: items.length,
      completedRequests: items.filter((item) => item.status === 'completed').length,
      awaitingPaymentRequests: items.filter(
        (item) => item.status === 'awaiting_payment',
      ).length,
      totalAmount,
      byNazrType: Array.from(byType.values()).map((item) => ({
        ...item,
        sharePercent:
          totalAmount.amount > 0
            ? Math.round((item.totalAmount.amount / totalAmount.amount) * 100)
            : 0,
      })),
    };
  }

  async getPayments(
    userId: string,
    query: UserPaymentHistoryQuery,
  ): Promise<Paginated<Payment>> {
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const requestWhere = { userId };
    const where = query.search
      ? {
          nazrRequest: requestWhere,
          transactionReference: Like(`%${query.search}%`),
        }
      : { nazrRequest: requestWhere };

    const [items, total] = await this.paymentsRepo.findAndCount({
      where,
      relations: { nazrRequest: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const filtered = items.filter((item) => {
      const createdAt = item.createdAt.getTime();
      const fromOk = query.from ? createdAt >= new Date(query.from).getTime() : true;
      const toOk = query.to ? createdAt <= new Date(query.to).getTime() : true;
      return fromOk && toOk;
    });

    return {
      items: filtered.map((item) => this.toPaymentDto(item)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getWallet(userId: string): Promise<Wallet> {
    return this.toWalletDto(await this.ensureWallet(userId));
  }

  async updateWalletSettings(
    userId: string,
    payload: UpdateWalletSettingsRequest,
  ): Promise<Wallet> {
    const wallet = await this.ensureWallet(userId);
    const amount = payload.monthlyDeductionAmount ?? null;
    if (payload.isMonthlyDeductionEnabled && !this.isValidAmount(amount)) {
      this.throwValidation({
        monthlyDeductionAmount: 'مبلغ برداشت ماهانه معتبر نیست',
      });
    }
    wallet.isMonthlyDeductionEnabled = Boolean(payload.isMonthlyDeductionEnabled);
    wallet.monthlyDeductionAmount = payload.isMonthlyDeductionEnabled ? amount : null;
    return this.toWalletDto(await this.walletsRepo.save(wallet));
  }

  async createWalletCharge(
    userId: string,
    payload: CreateWalletChargeRequest,
  ): Promise<WalletTransaction> {
    if (!this.isValidAmount(payload.amount)) {
      this.throwValidation({ amount: 'مبلغ شارژ کیف پول معتبر نیست' });
    }
    const wallet = await this.ensureWallet(userId);
    wallet.balance = this.addMoney(wallet.balance, payload.amount);
    await this.walletsRepo.save(wallet);
    const transaction = await this.walletTransactionsRepo.save(
      this.walletTransactionsRepo.create({
        walletId: wallet.id,
        wallet,
        type: 'charge',
        amount: payload.amount,
        description: 'شارژ کیف پول',
      }),
    );
    return this.toWalletTransactionDto(transaction);
  }

  async getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
    const wallet = await this.ensureWallet(userId);
    const transactions = await this.walletTransactionsRepo.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
    });
    return transactions.map((item) => this.toWalletTransactionDto(item));
  }

  async getClub(userId: string): Promise<UserClubStatus> {
    const user = await this.getUserOrFail(userId);
    const contributions = await this.getContributions(userId);
    const joinedDays = Math.max(
      1,
      Math.ceil((Date.now() - user.createdAt.getTime()) / 86400000),
    );
    const points = contributions.totalRequests * 20 + joinedDays;
    const missions = this.createMissions(contributions.totalRequests, joinedDays);
    return {
      level: points >= 500 ? 'همراه ویژه' : points >= 150 ? 'همراه فعال' : 'همراه تازه',
      points,
      joinedDays,
      missions,
    };
  }

  async getGallery(nazrTypeId?: string): Promise<GalleryAsset[]> {
    const assets = await this.galleryRepo.find({
      where: nazrTypeId ? { nazrTypeId } : {},
      order: { createdAt: 'DESC' },
    });
    return assets.map((item) => this.toGalleryAssetDto(item));
  }

  async createInvitationCard(
    userId: string,
    payload: CreateInvitationCardRequest,
  ): Promise<InvitationCard> {
    const friendName = payload.friendName?.trim();
    if (!friendName || friendName.length < 2 || friendName.length > 120) {
      this.throwValidation({ friendName: 'نام دوست معتبر نیست' });
    }
    const friendMobile = payload.friendMobile?.trim() || null;
    if (friendMobile && !isValidIranMobile(friendMobile)) {
      this.throwValidation({ friendMobile: 'شماره همراه دوست معتبر نیست' });
    }
    const user = await this.getUserOrFail(userId);
    const message = `${friendName} عزیز، ${user.fullName} شما را به همراهی در طرح‌های نذر امام دعوت کرده است.`;
    const downloadText = `${message}\n\nبا هم می‌توانیم سهم کوچکی از یک کار خوب داشته باشیم.`;
    const card = await this.invitationCardsRepo.save(
      this.invitationCardsRepo.create({
        userId,
        user,
        friendName,
        friendMobile,
        message,
        downloadText,
      }),
    );
    return this.toInvitationCardDto(card);
  }

  async getInvitationCards(userId: string): Promise<InvitationCard[]> {
    const cards = await this.invitationCardsRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return cards.map((item) => this.toInvitationCardDto(item));
  }

  private async getUserOrFail(userId: string): Promise<UserEntity> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
        message: 'کاربر پیدا نشد',
      });
    }
    return user;
  }

  private async ensureWallet(userId: string): Promise<WalletEntity> {
    const existing = await this.walletsRepo.findOne({ where: { userId } });
    if (existing) return existing;
    const user = await this.getUserOrFail(userId);
    return this.walletsRepo.save(
      this.walletsRepo.create({
        userId,
        user,
        balance: { amount: 0, currency: 'IRT' },
        isMonthlyDeductionEnabled: false,
        monthlyDeductionAmount: null,
      }),
    );
  }

  private toProfileDetails(user: UserEntity): UserProfileDetails {
    return {
      id: user.id,
      fullName: user.fullName,
      mobile: user.mobile,
      eitaNumber: user.eitaNumber,
      activePlatforms: user.activePlatforms ?? [],
      motivationalTarget: user.motivationalTarget,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private toPaymentDto(payment: PaymentEntity): Payment {
    return {
      id: payment.id,
      nazrRequestId: payment.nazrRequestId,
      method: payment.method,
      status: payment.status,
      amount: payment.amount,
      transactionReference: payment.transactionReference,
      receiptUrl: payment.receiptUrl,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  private toWalletDto(wallet: WalletEntity): Wallet {
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      isMonthlyDeductionEnabled: wallet.isMonthlyDeductionEnabled,
      monthlyDeductionAmount: wallet.monthlyDeductionAmount,
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }

  private toWalletTransactionDto(
    transaction: WalletTransactionEntity,
  ): WalletTransaction {
    return {
      id: transaction.id,
      walletId: transaction.walletId,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      createdAt: transaction.createdAt.toISOString(),
    };
  }

  private toGalleryAssetDto(asset: GalleryAssetEntity): GalleryAsset {
    return {
      id: asset.id,
      nazrTypeId: asset.nazrTypeId,
      title: asset.title,
      type: asset.type,
      fileUrl: asset.fileUrl,
      thumbnailUrl: asset.thumbnailUrl,
      createdAt: asset.createdAt.toISOString(),
    };
  }

  private toInvitationCardDto(card: InvitationCardEntity): InvitationCard {
    return {
      id: card.id,
      userId: card.userId,
      friendName: card.friendName,
      friendMobile: card.friendMobile,
      message: card.message,
      downloadText: card.downloadText,
      createdAt: card.createdAt.toISOString(),
    };
  }

  private createMissions(totalRequests: number, joinedDays: number): UserMission[] {
    return [
      {
        id: 'first-nazr',
        title: 'اولین مشارکت',
        description: 'اولین نذر خود را ثبت کنید.',
        points: 20,
        status: totalRequests >= 1 ? 'completed' : 'available',
      },
      {
        id: 'three-nazrs',
        title: 'سه همراهی',
        description: 'در سه طرح نذر شرکت کنید.',
        points: 60,
        status:
          totalRequests >= 3 ? 'completed' : totalRequests >= 1 ? 'available' : 'locked',
      },
      {
        id: 'old-friend',
        title: 'همراه ماندگار',
        description: '۳۰ روز از عضویت شما گذشته باشد.',
        points: 30,
        status: joinedDays >= 30 ? 'completed' : 'available',
      },
    ];
  }

  private sumMoney(items: Money[]): Money {
    return items.reduce(
      (sum, item) => this.addMoney(sum, item),
      { amount: 0, currency: items[0]?.currency ?? 'IRT' },
    );
  }

  private addMoney(left: Money, right: Money): Money {
    return {
      amount: left.amount + right.amount,
      currency: left.currency,
    };
  }

  private isValidAmount(amount?: Money | null): amount is Money {
    return (
      Boolean(amount) &&
      Number.isFinite(amount!.amount) &&
      amount!.amount > 0 &&
      ['IRR', 'IRT'].includes(amount!.currency)
    );
  }

  private normalizePage(page?: number): number {
    return Math.max(1, Number(page) || 1);
  }

  private normalizePageSize(pageSize?: number): number {
    return Math.min(50, Math.max(1, Number(pageSize) || 12));
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
}
