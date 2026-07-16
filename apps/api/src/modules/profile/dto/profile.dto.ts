import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  CreateInvitationCardRequest,
  Money,
  UpdateMotivationalTargetRequest,
  UpdateUserProfileDetailsRequest,
  UpdateWalletSettingsRequest,
  UserPlatform,
} from '@nazr-emam/shared';

export class UpdateUserProfileDetailsDto implements UpdateUserProfileDetailsRequest {
  @ApiPropertyOptional({ example: 'محمد مداحی' })
  fullName?: string;

  @ApiPropertyOptional({ example: '09123456789' })
  mobile?: string;

  @ApiPropertyOptional({ example: '09123456789', nullable: true })
  eitaNumber?: string | null;

  @ApiPropertyOptional({
    enum: ['eitaa', 'instagram', 'telegram', 'whatsapp', 'website', 'other'],
    isArray: true,
  })
  activePlatforms?: UserPlatform[];
}

export class UpdateMotivationalTargetDto implements UpdateMotivationalTargetRequest {
  @ApiProperty({ example: 'امسال در سه طرح نذر شرکت کنم.', nullable: true })
  motivationalTarget!: string | null;
}

export class MoneyDto implements Money {
  @ApiProperty({ example: 300000 })
  amount!: number;

  @ApiProperty({ enum: ['IRR', 'IRT'], example: 'IRT' })
  currency!: 'IRR' | 'IRT';
}

export class UpdateWalletSettingsDto implements UpdateWalletSettingsRequest {
  @ApiProperty({ example: true })
  isMonthlyDeductionEnabled!: boolean;

  @ApiPropertyOptional({ type: MoneyDto, nullable: true })
  monthlyDeductionAmount?: Money | null;
}

export class CreateInvitationCardDto implements CreateInvitationCardRequest {
  @ApiProperty({ example: 'علی' })
  friendName!: string;

  @ApiPropertyOptional({ example: '09123456789', nullable: true })
  friendMobile?: string | null;
}
