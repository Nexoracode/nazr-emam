import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Money, NazrType } from '@nazr-emam/shared';
import { MoneyDto } from '../../nazr-requests/dto/nazr-request.dto';

export class NazrTypeDto implements NazrType {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiPropertyOptional({ type: MoneyDto, nullable: true }) suggestedAmount!: Money | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}
