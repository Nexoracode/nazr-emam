import type { ID, ISODate } from './api';

export type UserRole = 'donor' | 'admin';

export interface RegisterRequest {
  fullName: string;
  mobile: string;
  password: string;
}

export interface LoginRequest {
  mobile: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface User {
  id: ID;
  fullName: string;
  mobile: string;
  role: UserRole;
  createdAt: ISODate;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
