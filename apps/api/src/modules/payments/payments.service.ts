import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type {
  CreateWalletChargeRequest,
  Money,
  StartOnlinePaymentResponse,
  StartWalletChargeResponse,
  User,
} from '@nazr-emam/shared';
import { NazrRequestEntity } from '../nazr-requests/entities/nazr-request.entity';
import { WalletTransactionEntity } from '../profile/entities/wallet-transaction.entity';
import { WalletEntity } from '../profile/entities/wallet.entity';
import { PaymentEntity } from './entities/payment.entity';

interface ZarinpalRequestResponse {
  data?: {
    code?: number;
    authority?: string;
    message?: string;
  };
  errors?: unknown;
}

interface ZarinpalVerifyResponse {
  data?: {
    code?: number;
    ref_id?: number;
  };
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(NazrRequestEntity)
    private readonly nazrRequestsRepo: Repository<NazrRequestEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepo: Repository<PaymentEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletsRepo: Repository<WalletEntity>,
    @InjectRepository(WalletTransactionEntity)
    private readonly walletTransactionsRepo: Repository<WalletTransactionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async startOnlinePayment(
    requestId: string,
    user: User,
  ): Promise<StartOnlinePaymentResponse> {
    this.ensureGatewayEnabled();

    const nazrRequest = await this.nazrRequestsRepo.findOne({
      where: { id: requestId },
      relations: { nazrType: true },
    });

    if (!nazrRequest) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'NAZR_REQUEST_NOT_FOUND',
        message: 'درخواست نذر پیدا نشد',
      });
    }

    if (nazrRequest.userId !== user.id) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'شما به این درخواست نذر دسترسی ندارید',
      });
    }

    const payment = await this.paymentsRepo.save(
      this.paymentsRepo.create({
        nazrRequestId: nazrRequest.id,
        nazrRequest,
        method: 'online',
        status: 'pending',
        amount: nazrRequest.amount,
        transactionReference: null,
        receiptUrl: null,
      }),
    );

    const callbackUrl = `${this.apiBaseUrl}/payments/zarinpal/callback`;
    const response = await this.requestZarinpalAuthority({
      amount: this.toRial(nazrRequest.amount),
      callbackUrl,
      description: `پرداخت نذر ${nazrRequest.trackingCode}`,
      mobile: nazrRequest.donorMobile,
    });

    const authority = response.data?.authority;
    if (response.data?.code !== 100 || !authority) {
      await this.rejectPaymentAndCancelRequest(payment);
      throw new BadRequestException({
        statusCode: 400,
        code: 'ZARINPAL_REQUEST_FAILED',
        message: 'شروع پرداخت آنلاین انجام نشد. لطفاً دوباره تلاش کنید',
      });
    }

    payment.transactionReference = authority;
    await this.paymentsRepo.save(payment);

    return {
      paymentId: payment.id,
      authority,
      paymentUrl: `${this.zarinpalStartPayUrl}/${authority}`,
    };
  }

  async startWalletCharge(
    user: User,
    payload: CreateWalletChargeRequest,
  ): Promise<StartWalletChargeResponse> {
    this.ensureGatewayEnabled();
    if (!this.isValidWalletCharge(payload.amount)) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'مبلغ شارژ کیف پول معتبر نیست',
        fields: { amount: 'مبلغ شارژ باید بیشتر از صفر و به تومان باشد' },
      });
    }

    const wallet = await this.ensureWallet(user.id);
    const transaction = await this.walletTransactionsRepo.save(
      this.walletTransactionsRepo.create({
        walletId: wallet.id,
        wallet,
        type: 'charge',
        status: 'pending',
        amount: payload.amount,
        description: 'شارژ آنلاین کیف پول',
        gatewayAuthority: null,
        transactionReference: null,
      }),
    );

    try {
      const response = await this.requestZarinpalAuthority({
        amount: this.toRial(payload.amount),
        callbackUrl: `${this.apiBaseUrl}/payments/zarinpal/callback`,
        description: 'شارژ کیف پول نذر امام',
        mobile: user.mobile,
      });
      const authority = response.data?.authority;
      if (response.data?.code !== 100 || !authority) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'ZARINPAL_REQUEST_FAILED',
          message: 'شروع پرداخت شارژ انجام نشد. لطفاً دوباره تلاش کنید',
        });
      }

      transaction.gatewayAuthority = authority;
      await this.walletTransactionsRepo.save(transaction);
      return {
        transactionId: transaction.id,
        authority,
        paymentUrl: `${this.zarinpalStartPayUrl}/${authority}`,
      };
    } catch (error) {
      await this.failWalletCharge(transaction);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException({
        statusCode: 400,
        code: 'ZARINPAL_REQUEST_FAILED',
        message: 'ارتباط با درگاه پرداخت برقرار نشد. دوباره تلاش کنید',
      });
    }
  }

  async handleZarinpalCallback(authority?: string, status?: string): Promise<string> {
    if (!authority) return `${this.frontendUrl}/dashboard?payment=failed`;

    const payment = await this.paymentsRepo.findOne({
      where: { transactionReference: authority },
      relations: { nazrRequest: true },
    });

    if (!payment) return this.handleWalletChargeCallback(authority, status);

    if (status !== 'OK') {
      await this.rejectPaymentAndCancelRequest(payment);
      return `${this.frontendUrl}/dashboard?payment=cancelled`;
    }

    const verified = await this.verifyZarinpalPayment(authority, this.toRial(payment.amount));
    const refId = verified.data?.ref_id;
    if (verified.data?.code === 100 || verified.data?.code === 101) {
      payment.status = 'paid';
      payment.transactionReference = refId ? String(refId) : authority;
      payment.nazrRequest.status = 'confirmed';
      await this.nazrRequestsRepo.save(payment.nazrRequest);
      await this.paymentsRepo.save(payment);
      return `${this.frontendUrl}/dashboard?payment=paid`;
    }

    payment.status = 'rejected';
    await this.rejectPaymentAndCancelRequest(payment);
    return `${this.frontendUrl}/dashboard?payment=failed`;
  }

  private async handleWalletChargeCallback(
    authority: string,
    status?: string,
  ): Promise<string> {
    const transaction = await this.walletTransactionsRepo.findOne({
      where: { gatewayAuthority: authority },
      relations: { wallet: true },
    });
    if (!transaction || transaction.type !== 'charge') {
      return this.walletRedirect('failed');
    }
    if (transaction.status === 'completed') return this.walletRedirect('paid');
    if (status !== 'OK') {
      await this.failWalletCharge(transaction);
      return this.walletRedirect('cancelled');
    }

    const verified = await this.verifyZarinpalPayment(
      authority,
      this.toRial(transaction.amount),
    );
    if (verified.data?.code !== 100 && verified.data?.code !== 101) {
      await this.failWalletCharge(transaction);
      return this.walletRedirect('failed');
    }

    await this.dataSource.transaction(async (manager) => {
      const transactionRepo = manager.getRepository(WalletTransactionEntity);
      const walletRepo = manager.getRepository(WalletEntity);
      const lockedTransaction = await transactionRepo.findOne({
        where: { id: transaction.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedTransaction || lockedTransaction.status === 'completed') return;
      const wallet = await walletRepo.findOne({
        where: { id: lockedTransaction.walletId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) throw new NotFoundException('کیف پول پیدا نشد');

      wallet.balance = {
        amount: wallet.balance.amount + lockedTransaction.amount.amount,
        currency: wallet.balance.currency,
      };
      lockedTransaction.status = 'completed';
      lockedTransaction.transactionReference = verified.data?.ref_id
        ? String(verified.data.ref_id)
        : authority;
      await walletRepo.save(wallet);
      await transactionRepo.save(lockedTransaction);
    });

    return this.walletRedirect('paid');
  }

  private async failWalletCharge(transaction: WalletTransactionEntity): Promise<void> {
    if (transaction.status === 'completed') return;
    transaction.status = 'failed';
    await this.walletTransactionsRepo.save(transaction);
  }

  private walletRedirect(status: 'paid' | 'cancelled' | 'failed'): string {
    return `${this.frontendUrl}/profile?tab=wallet&walletCharge=${status}`;
  }

  private async ensureWallet(userId: string): Promise<WalletEntity> {
    const existing = await this.walletsRepo.findOne({ where: { userId } });
    if (existing) return existing;
    return this.walletsRepo.save(
      this.walletsRepo.create({
        userId,
        balance: { amount: 0, currency: 'IRT' },
        isMonthlyDeductionEnabled: false,
        monthlyDeductionAmount: null,
        nextMonthlyDeductionAt: null,
        lastMonthlyDeductionAt: null,
      }),
    );
  }

  private isValidWalletCharge(amount?: Money | null): amount is Money {
    return Boolean(
      amount &&
        Number.isFinite(amount.amount) &&
        amount.amount > 0 &&
        amount.currency === 'IRT',
    );
  }

  private async rejectPaymentAndCancelRequest(payment: PaymentEntity): Promise<void> {
    payment.status = 'rejected';
    if (payment.nazrRequest) {
      payment.nazrRequest.status = 'cancelled';
      await this.nazrRequestsRepo.save(payment.nazrRequest);
    }
    await this.paymentsRepo.save(payment);
  }

  private ensureGatewayEnabled() {
    if (!this.gatewayEnabled || !this.merchantId) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'PAYMENT_GATEWAY_DISABLED',
        message: 'پرداخت آنلاین هنوز فعال نشده است',
      });
    }
  }

  private async requestZarinpalAuthority(input: {
    amount: number;
    callbackUrl: string;
    description: string;
    mobile: string;
  }) {
    const response = await fetch(this.zarinpalRequestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount: input.amount,
        callback_url: input.callbackUrl,
        description: input.description,
        metadata: { mobile: input.mobile },
      }),
    });

    return (await response.json()) as ZarinpalRequestResponse;
  }

  private async verifyZarinpalPayment(authority: string, amount: number) {
    const response = await fetch(this.zarinpalVerifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount,
        authority,
      }),
    });

    return (await response.json()) as ZarinpalVerifyResponse;
  }

  private toRial(amount: Money) {
    return amount.currency === 'IRT' ? amount.amount * 10 : amount.amount;
  }

  private get gatewayEnabled() {
    return this.configService.get<boolean>('payment.gatewayEnabled', false);
  }

  private get merchantId() {
    return this.configService.get<string>('payment.zarinpalMerchantId', '');
  }

  private get apiBaseUrl() {
    return this.configService.get<string>('payment.apiBaseUrl', 'http://localhost:3001');
  }

  private get frontendUrl() {
    return this.configService.get<string>('payment.frontendUrl', 'http://localhost:3000');
  }

  private get zarinpalRequestUrl() {
    return this.zarinpalSandbox
      ? 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
      : 'https://payment.zarinpal.com/pg/v4/payment/request.json';
  }

  private get zarinpalVerifyUrl() {
    return this.zarinpalSandbox
      ? 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'
      : 'https://payment.zarinpal.com/pg/v4/payment/verify.json';
  }

  private get zarinpalStartPayUrl() {
    return this.zarinpalSandbox
      ? 'https://sandbox.zarinpal.com/pg/StartPay'
      : 'https://payment.zarinpal.com/pg/StartPay';
  }

  private get zarinpalSandbox() {
    return this.configService.get<boolean>('payment.zarinpalSandbox', true);
  }
}
