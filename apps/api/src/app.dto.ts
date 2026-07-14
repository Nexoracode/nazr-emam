import { ApiProperty } from '@nestjs/swagger';
import type { HealthResponse, ProjectInfo } from '@nazr-emam/shared';

export class HealthResponseDto implements HealthResponse {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 'nazr-emam-api' })
  service!: 'nazr-emam-api';

  @ApiProperty({ example: '2026-07-14T07:30:00.000Z' })
  timestamp!: string;
}

export class ProjectInfoDto implements ProjectInfo {
  @ApiProperty({ example: 'Nazr Emam' })
  name!: 'Nazr Emam';

  @ApiProperty({ example: 'Initial API for the Nazr Emam project' })
  description!: string;

  @ApiProperty({
    example: ['register-request', 'review-request', 'track-status'],
    type: [String],
  })
  workflow!: string[];
}
