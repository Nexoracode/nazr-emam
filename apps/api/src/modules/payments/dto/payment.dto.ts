import { ApiProperty } from '@nestjs/swagger';
import type {
  CreateWalletChargeRequest,
  Money,
  StartOnlinePaymentResponse,
  StartWalletChargeResponse,
} from '@nazr-emam/shared';

export class StartOnlinePaymentResponseDto implements StartOnlinePaymentResponse {
  @ApiProperty()
  paymentId!: string;

  @ApiProperty()
  paymentUrl!: string;

  @ApiProperty()
  authority!: string;
}

export class StartWalletChargeDto implements CreateWalletChargeRequest {
  @ApiProperty({
    example: { amount: 300000, currency: 'IRT' },
  })
  amount!: Money;
}

export class StartWalletChargeResponseDto implements StartWalletChargeResponse {
  @ApiProperty()
  transactionId!: string;

  @ApiProperty()
  paymentUrl!: string;

  @ApiProperty()
  authority!: string;
}
