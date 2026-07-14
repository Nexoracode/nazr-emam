import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AuthResponse,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  User,
} from '@nazr-emam/shared';
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { IsNull, Repository } from 'typeorm';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UserEntity } from './entities/user.entity';

interface Session {
  userId: string;
  accessToken: string;
  refreshTokenHash: string;
  createdAt: string;
}

@Injectable()
export class AuthService {
  private readonly sessionsByAccessToken = new Map<string, Session>();

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokensRepository: Repository<RefreshTokenEntity>,
  ) {}

  async register(payload: RegisterRequest): Promise<AuthResponse> {
    const body = this.validateRegister(payload);

    const existingUser = await this.usersRepository.findOne({
      where: { mobile: body.mobile },
    });

    if (existingUser) {
      throw new ConflictException({
        statusCode: 409,
        code: 'MOBILE_TAKEN',
        message: 'شماره موبایل قبلا ثبت شده است',
      });
    }

    const user = this.usersRepository.create({
      fullName: body.fullName,
      mobile: body.mobile,
      role: 'donor',
      passwordHash: this.hashPassword(body.password),
    });

    const savedUser = await this.usersRepository.save(user);

    return this.createAuthResponse(savedUser);
  }

  async login(payload: LoginRequest): Promise<AuthResponse> {
    const body = this.validateLogin(payload);
    const user = await this.usersRepository.findOne({
      where: { mobile: body.mobile },
    });

    if (!user || !this.verifyPassword(body.password, user.passwordHash)) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'شماره موبایل یا رمز عبور اشتباه است',
      });
    }

    return this.createAuthResponse(user);
  }

  async refresh(payload: RefreshTokenRequest): Promise<AuthResponse> {
    const refreshToken = this.validateRefresh(payload).refreshToken;
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokensRepository.findOne({
      where: { tokenHash, revokedAt: IsNull() },
      relations: { user: true },
    });
    const user = storedToken?.user;

    if (!storedToken || !user) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'توکن تازه سازی معتبر نیست',
      });
    }

    storedToken.revokedAt = new Date();
    await this.refreshTokensRepository.save(storedToken);

    return this.createAuthResponse(user);
  }

  async logout(accessToken?: string): Promise<void> {
    if (!accessToken) {
      return;
    }

    const session = this.sessionsByAccessToken.get(accessToken);
    if (session) {
      await this.refreshTokensRepository.update(
        { tokenHash: session.refreshTokenHash, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      this.sessionsByAccessToken.delete(session.accessToken);
    }
  }

  async getUserByAccessToken(accessToken?: string): Promise<User | null> {
    if (!accessToken) {
      return null;
    }

    const session = this.sessionsByAccessToken.get(accessToken);
    const user = session
      ? await this.usersRepository.findOne({ where: { id: session.userId } })
      : undefined;
    return user ? this.toPublicUser(user) : null;
  }

  private async createAuthResponse(user: UserEntity): Promise<AuthResponse> {
    const refreshToken = this.createToken();
    const refreshTokenHash = this.hashToken(refreshToken);
    const session: Session = {
      userId: user.id,
      accessToken: this.createToken(),
      refreshTokenHash,
      createdAt: new Date().toISOString(),
    };

    const storedRefreshToken = this.refreshTokensRepository.create({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: null,
      revokedAt: null,
    });
    await this.refreshTokensRepository.save(storedRefreshToken);

    this.sessionsByAccessToken.set(session.accessToken, session);

    return {
      user: this.toPublicUser(user),
      accessToken: session.accessToken,
      refreshToken,
    };
  }

  private toPublicUser(user: UserEntity): User {
    return {
      id: user.id,
      fullName: user.fullName,
      mobile: user.mobile,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private validateRegister(payload: RegisterRequest): RegisterRequest {
    const fields: Record<string, string> = {};
    const fullName = payload?.fullName?.trim();
    const mobile = payload?.mobile?.trim();
    const password = payload?.password;

    if (!fullName || fullName.length < 2) {
      fields.fullName = 'نام کامل معتبر نیست';
    }

    if (!this.isValidMobile(mobile)) {
      fields.mobile = 'شماره موبایل معتبر نیست';
    }

    if (!password || password.length < 8) {
      fields.password = 'رمز عبور باید حداقل ۸ کاراکتر باشد';
    }

    this.throwValidation(fields);

    return {
      fullName,
      mobile,
      password,
    };
  }

  private validateLogin(payload: LoginRequest): LoginRequest {
    const fields: Record<string, string> = {};
    const mobile = payload?.mobile?.trim();
    const password = payload?.password;

    if (!this.isValidMobile(mobile)) {
      fields.mobile = 'شماره موبایل معتبر نیست';
    }

    if (!password) {
      fields.password = 'رمز عبور الزامی است';
    }

    this.throwValidation(fields);

    return {
      mobile,
      password,
    };
  }

  private validateRefresh(payload: RefreshTokenRequest): RefreshTokenRequest {
    const refreshToken = payload?.refreshToken?.trim();

    this.throwValidation(
      refreshToken ? {} : { refreshToken: 'refreshToken الزامی است' },
    );

    return { refreshToken };
  }

  private throwValidation(fields: Record<string, string>): void {
    if (Object.keys(fields).length === 0) {
      return;
    }

    throw new BadRequestException({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'ورودی نامعتبر است',
      fields,
    });
  }

  private isValidMobile(mobile?: string): mobile is string {
    return /^09\d{9}$/.test(mobile ?? '');
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, passwordHash: string): boolean {
    const [salt, storedHash] = passwordHash.split(':');
    if (!salt || !storedHash) {
      return false;
    }

    const hash = scryptSync(password, salt, 64);
    const stored = Buffer.from(storedHash, 'hex');
    return hash.length === stored.length && timingSafeEqual(hash, stored);
  }

  private createToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
