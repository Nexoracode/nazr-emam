import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  CreateNazrRequest,
  DonorGender,
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
  @ApiPropertyOptional({ nullable: true }) donorFirstName!: string | null;
  @ApiPropertyOptional({ nullable: true }) donorLastName!: string | null;
  @ApiPropertyOptional({ enum: ['male', 'female'], nullable: true }) donorGender!: DonorGender | null;
  @ApiProperty() donorMobile!: string;
  @ApiPropertyOptional({ nullable: true }) donorNationalCode!: string | null;
  @ApiProperty({ type: MoneyDto }) amount!: Money;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiProperty() isAnonymous!: boolean;
  @ApiProperty() isMonthlyFixed!: boolean;
  @ApiProperty() wantsMonthlyFollowUp!: boolean;
  @ApiProperty() status!: NazrRequestStatus;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class CreateNazrRequestDto implements CreateNazrRequest {
  @ApiProperty()
  nazrTypeId!: string;

  @ApiPropertyOptional({ nullable: true })
  donorNationalCode?: string | null;

  @ApiPropertyOptional({ example: 'مهدی' })
  donorFirstName?: string | null;

  @ApiPropertyOptional({ example: 'روح‌بخش' })
  donorLastName?: string | null;

  @ApiPropertyOptional({ enum: ['male', 'female'] })
  donorGender?: DonorGender | null;

  @ApiProperty({ type: MoneyDto })
  amount!: Money;

  @ApiPropertyOptional({ nullable: true })
  note?: string | null;

  @ApiPropertyOptional({ default: false })
  isAnonymous?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'تعهد پرداخت همین مبلغ در هر ماه',
  })
  isMonthlyFixed?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'افزودن به لیست پیگیری ماهانه پشتیبان',
  })
  wantsMonthlyFollowUp?: boolean;
}

export class PaginatedNazrRequestDto implements Paginated<NazrRequest> {
  @ApiProperty({ type: [NazrRequestDto] }) items!: NazrRequest[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}
