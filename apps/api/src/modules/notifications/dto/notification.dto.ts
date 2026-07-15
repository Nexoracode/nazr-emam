import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateNotificationRequest } from '@nazr-emam/shared';

export class CreateNotificationDto implements CreateNotificationRequest {
  @ApiPropertyOptional({ example: 'user-id', nullable: true })
  userId?: string | null;

  @ApiProperty({ example: 'پرداخت شما ثبت شد' })
  title!: string;

  @ApiProperty({ example: 'رسید پرداخت شما در حال بررسی است.' })
  body!: string;

  @ApiPropertyOptional({ example: '/profile', nullable: true })
  link?: string | null;
}
