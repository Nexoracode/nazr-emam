import type { ID, ISODate } from './api';

export type UserRole = 'donor' | 'admin';

export const iranMobilePrefixes = [
  '0900',
  '0901',
  '0902',
  '0903',
  '0904',
  '0905',
  '0910',
  '0911',
  '0912',
  '0913',
  '0914',
  '0915',
  '0916',
  '0917',
  '0918',
  '0919',
  '0920',
  '0921',
  '0922',
  '0923',
  '0930',
  '0931',
  '0932',
  '0933',
  '0934',
  '0935',
  '0936',
  '0937',
  '0938',
  '0939',
  '0941',
  '0955',
  '0990',
  '0991',
  '0992',
  '0993',
  '0994',
  '0998',
  '0999',
] as const;

export function normalizeIranMobile(mobile: string): string {
  return mobile.trim().replace(/[\s-]/g, '');
}

export function isValidIranMobile(mobile?: string | null): mobile is string {
  if (!mobile) {
    return false;
  }

  const normalizedMobile = normalizeIranMobile(mobile);
  return (
    /^\d{11}$/.test(normalizedMobile) &&
    iranMobilePrefixes.some((prefix) => normalizedMobile.startsWith(prefix))
  );
}

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

export interface RequestOtpRequest {
  mobile: string;
}

export interface VerifyOtpRequest {
  mobile: string;
  code: string;
}

export interface OtpRequestResponse {
  expiresAt: ISODate;
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
}
