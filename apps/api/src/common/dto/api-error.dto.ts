import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ApiError } from '@nazr-emam/shared';

export class ApiErrorDto implements ApiError {
  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode!: number;

  @ApiProperty({ example: 'VALIDATION_ERROR', description: 'Stable error code' })
  code!: string;

  @ApiProperty({ example: 'ورودی نامعتبر است', description: 'Persian error message' })
  message!: string;

  @ApiPropertyOptional({
    example: { mobile: 'شماره موبایل معتبر نیست' },
    description: 'Field-level validation messages',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  fields?: Record<string, string>;
}
