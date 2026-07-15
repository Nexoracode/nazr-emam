import { Controller, Get, Param, Post, Query, Redirect, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth.service';
import { StartOnlinePaymentResponseDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @ApiBearerAuth()
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({ summary: 'شروع پرداخت آنلاین زرین‌پال برای نذر' })
  @ApiCreatedResponse({ type: StartOnlinePaymentResponseDto })
  @Post('nazr-requests/:requestId/payments/online/start')
  startOnlinePayment(
    @Param('requestId') requestId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.startOnlinePayment(requestId, request.user!);
  }

  @Public()
  @ApiOperation({ summary: 'بازگشت از زرین‌پال و تایید پرداخت' })
  @Get('payments/zarinpal/callback')
  @Redirect()
  async zarinpalCallback(
    @Query('Authority') authority?: string,
    @Query('Status') status?: string,
  ) {
    return {
      url: await this.service.handleZarinpalCallback(authority, status),
      statusCode: 302,
    };
  }
}
