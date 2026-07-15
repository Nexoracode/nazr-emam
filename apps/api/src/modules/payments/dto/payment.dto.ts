import { ApiProperty } from '@nestjs/swagger';
import type { StartOnlinePaymentResponse } from '@nazr-emam/shared';

export class StartOnlinePaymentResponseDto implements StartOnlinePaymentResponse {
  @ApiProperty()
  paymentId!: string;

  @ApiProperty()
  paymentUrl!: string;

  @ApiProperty()
  authority!: string;
}
