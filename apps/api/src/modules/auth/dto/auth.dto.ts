import { ApiProperty } from '@nestjs/swagger';
import type {
  AuthResponse,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  User,
  UserRole,
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

  @ApiProperty({
    example: 'QWNjZXNzLXRva2VuLXNhbXBsZQ',
    description: 'توکن دسترسی برای Authorization: Bearer <accessToken>',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'UmVmcmVzaC10b2tlbi1zYW1wbGU',
    description: 'توکن تازه سازی برای POST /auth/refresh',
  })
  refreshToken!: string;
}
