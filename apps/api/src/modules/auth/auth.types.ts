import type { User } from '@nazr-emam/shared';

export interface AuthenticatedRequest {
  headers?: {
    authorization?: string | string[];
  };
  user?: User;
  accessToken?: string;
}
