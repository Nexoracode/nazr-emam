import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateTicketRequest } from '@nazr-emam/shared';

export class CreateTicketDto implements CreateTicketRequest {
  @ApiProperty({ example: 'پیگیری پرداخت' })
  subject!: string;

  @ApiProperty({ example: 'سلام، وضعیت پرداخت من مشخص نشده است.' })
  body!: string;

  @ApiPropertyOptional({ example: '09123456789', nullable: true })
  guestMobile?: string | null;

  @ApiPropertyOptional({ example: 'NE-ABC-123', nullable: true })
  nazrRequestTrackingCode?: string | null;
}

export class ReplyTicketDto {
  @ApiProperty({ example: 'پاسخ پیام' })
  body!: string;
}
