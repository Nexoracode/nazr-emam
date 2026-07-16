import { ApiProperty } from '@nestjs/swagger';
import type {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  OtpRequestResponse,
  RefreshTokenRequest,
  RequestOtpRequest,
  ResetPasswordRequest,
  RegisterRequest,
  UpdateProfileRequest,
  User,
  UserRole,
  VerifyOtpRequest,
} from '@nazr-emam/shared';

export class RegisterRequestDto implements RegisterRequest {
  @ApiProperty({ example: 'علی رضایی', description: 'نام کامل کاربر' })
  fullName!: string;

  @ApiProperty({ example: '09123456789', description: 'شماره موبایل ایران' })
  mobile!: string;

  @ApiProperty({ example: 'StrongPass123', minLength: 8, description: 'رمز عبور' })
  password!: string;
}

export class LoginRequestDto implements LoginRequest {
  @ApiProperty({ example: '09123456789', description: 'شماره موبایل ایران' })
  mobile!: string;

  @ApiProperty({ example: 'StrongPass123', description: 'رمز عبور' })
  password!: string;
}

export class RefreshTokenRequestDto implements RefreshTokenRequest {
  @ApiProperty({
    example: 'Q2xvdWR5LWJ1dC1zdGFibGUtcmVmcmVzaC10b2tlbg',
    description: 'refreshToken دریافت شده از register/login/refresh',
  })
  refreshToken!: string;
}

export class RequestOtpRequestDto implements RequestOtpRequest {
  @ApiProperty({ example: '09123456789', description: 'شماره موبایل ایران' })
  mobile!: string;
}

export class VerifyOtpRequestDto implements VerifyOtpRequest {
  @ApiProperty({ example: '09123456789', description: 'شماره موبایل ایران' })
  mobile!: string;

  @ApiProperty({ example: '123456', description: 'کد یکبار مصرف' })
  code!: string;
}

export class ResetPasswordRequestDto implements ResetPasswordRequest {
  @ApiProperty({ example: '09123456789', description: 'شماره موبایل ایران' })
  mobile!: string;

  @ApiProperty({ example: '123456', description: 'کد تایید ارسال‌شده' })
  code!: string;

  @ApiProperty({ example: 'NewStrongPass123', minLength: 8, description: 'رمز عبور جدید' })
  newPassword!: string;
}

export class OtpRequestResponseDto implements OtpRequestResponse {
  @ApiProperty({ example: '2026-07-14T08:20:00.000Z' })
  expiresAt!: string;
}

export class UserDto implements User {
  @ApiProperty({ example: '7b4b3e89-42b8-4f7a-8b93-2a902b8f7749' })
  id!: string;

  @ApiProperty({ example: 'علی رضایی' })
  fullName!: string;

  @ApiProperty({ example: '09123456789' })
  mobile!: string;

  @ApiProperty({ enum: ['donor', 'admin'], example: 'donor' })
  role!: UserRole;

  @ApiProperty({ example: '2026-07-14T07:30:00.000Z' })
  createdAt!: string;
}

export class AuthResponseDto implements AuthResponse {
  @ApiProperty({ type: UserDto })
  user!: UserDto;
}

export class UpdateProfileRequestDto implements UpdateProfileRequest {
  @ApiProperty({ example: 'علی رضایی', description: 'نام کامل جدید' })
  fullName!: string;
}

export class ChangePasswordRequestDto implements ChangePasswordRequest {
  @ApiProperty({ example: 'OldPass123', description: 'رمز عبور فعلی' })
  currentPassword!: string;

  @ApiProperty({ example: 'NewPass456', minLength: 8, description: 'رمز عبور جدید' })
  newPassword!: string;
}
