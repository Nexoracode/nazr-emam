import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  CreateNazrRequest,
  Money,
  NazrRequest,
  NazrRequestStatus,
  NazrType,
  Paginated,
} from '@nazr-emam/shared';

export class MoneyDto implements Money {
  @ApiProperty({ example: 500000 })
  amount!: number;

  @ApiProperty({ enum: ['IRR', 'IRT'], example: 'IRT' })
  currency!: 'IRR' | 'IRT';
}

export class NazrTypeInRequestDto implements Pick<NazrType, 'id' | 'slug' | 'title'> {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
}

export class NazrRequestDto implements NazrRequest {
  @ApiProperty() id!: string;
  @ApiProperty() trackingCode!: string;
  @ApiPropertyOptional({ nullable: true }) userId!: string | null;
  @ApiProperty({ type: NazrTypeInRequestDto }) nazrType!: NazrType;
  @ApiProperty() donorFullName!: string;
  @ApiProperty() donorMobile!: string;
  @ApiPropertyOptional({ nullable: true }) donorNationalCode!: string | null;
  @ApiProperty({ type: MoneyDto }) amount!: Money;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiProperty() isAnonymous!: boolean;
  @ApiProperty() status!: NazrRequestStatus;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class CreateNazrRequestDto implements CreateNazrRequest {
  @ApiProperty()
  nazrTypeId!: string;

  @ApiProperty()
  donorFullName!: string;

  @ApiProperty()
  donorMobile!: string;

  @ApiPropertyOptional({ nullable: true })
  donorNationalCode?: string | null;

  @ApiProperty({ type: MoneyDto })
  amount!: Money;

  @ApiPropertyOptional({ nullable: true })
  note?: string | null;

  @ApiPropertyOptional({ default: false })
  isAnonymous?: boolean;
}

export class PaginatedNazrRequestDto implements Paginated<NazrRequest> {
  @ApiProperty({ type: [NazrRequestDto] }) items!: NazrRequest[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}
