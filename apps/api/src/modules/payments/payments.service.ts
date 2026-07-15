import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Money, StartOnlinePaymentResponse, User } from '@nazr-emam/shared';
import { NazrRequestEntity } from '../nazr-requests/entities/nazr-request.entity';
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

  async handleZarinpalCallback(authority?: string, status?: string): Promise<string> {
    if (!authority) return `${this.frontendUrl}/dashboard?payment=failed`;

    const payment = await this.paymentsRepo.findOne({
      where: { transactionReference: authority },
      relations: { nazrRequest: true },
    });

    if (!payment) return `${this.frontendUrl}/dashboard?payment=failed`;

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
