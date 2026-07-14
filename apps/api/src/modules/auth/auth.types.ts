import type { User } from '@nazr-emam/shared';

export interface AuthenticatedRequest {
  headers?: {
    authorization?: string | string[];
  };
  cookies?: Record<string, string | undefined>;
  user?: User;
  accessToken?: string;
}

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  maxAge?: number;
  path?: string;
}

export interface AuthenticatedResponse {
  cookie(name: string, value: string, options: CookieOptions): void;
  clearCookie(name: string, options: CookieOptions): void;
}
