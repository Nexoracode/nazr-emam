import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AuthResponse,
  LoginRequest,
  OtpRequestResponse,
  RefreshTokenRequest,
  RequestOtpRequest,
  RegisterRequest,
  User,
  VerifyOtpRequest,
} from '@nazr-emam/shared';
import { isValidIranMobile } from '@nazr-emam/shared';
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { IsNull, Repository } from 'typeorm';
import type { AuthenticatedRequest, AuthenticatedResponse } from './auth.types';
import { SmsService } from './sms.service';
import { OtpCodeEntity } from './entities/otp-code.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UserEntity } from './entities/user.entity';

export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';

interface Session {
  userId: string;
  accessToken: string;
  refreshTokenHash: string;
  expiresAt: Date;
}

interface AuthenticatedSession {
  user: User;
  tokens?: IssuedAuthTokens;
}

interface IssuedAuthTokens extends AuthResponse {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly sessionsByAccessToken = new Map<string, Session>();

  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokensRepository: Repository<RefreshTokenEntity>,
    @InjectRepository(OtpCodeEntity)
    private readonly otpCodesRepository: Repository<OtpCodeEntity>,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {}

  async register(payload: RegisterRequest): Promise<IssuedAuthTokens> {
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

  async login(payload: LoginRequest): Promise<IssuedAuthTokens> {
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

  async requestOtp(payload: RequestOtpRequest): Promise<OtpRequestResponse> {
    const body = this.validateRequestOtp(payload);
    const code = this.createOtpCode();
    const expiresAt = new Date(Date.now() + this.otpTtlMs);

    await this.otpCodesRepository.update(
      { mobile: body.mobile, consumedAt: IsNull() },
      { consumedAt: new Date() },
    );

    const otp = this.otpCodesRepository.create({
      mobile: body.mobile,
      codeHash: this.hashOtpCode(body.mobile, code),
      attempts: 0,
      expiresAt,
      consumedAt: null,
    });
    await this.otpCodesRepository.save(otp);

    if (process.env.FARAZ_SMS_API_KEY) {
      this.smsService.sendOtp(body.mobile, code).catch((err: unknown) => {
        this.logger.error(`❌ SMS send failed for ${body.mobile}: ${err instanceof Error ? err.message : err}`);
      });
    } else {
      this.logger.log(`[DEV] OTP for ${body.mobile}: ${code}`);
    }

    return { expiresAt: expiresAt.toISOString() };
  }

  async verifyOtp(payload: VerifyOtpRequest): Promise<IssuedAuthTokens> {
    const body = this.validateVerifyOtp(payload);
    const otp = await this.otpCodesRepository.findOne({
      where: { mobile: body.mobile, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!otp || otp.expiresAt.getTime() <= Date.now()) {
      if (otp) {
        otp.consumedAt = new Date();
        await this.otpCodesRepository.save(otp);
      }

      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_OTP',
        message: 'کد یکبار مصرف معتبر نیست',
      });
    }

    if (otp.attempts >= this.otpMaxAttempts) {
      otp.consumedAt = new Date();
      await this.otpCodesRepository.save(otp);

      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_OTP',
        message: 'کد یکبار مصرف معتبر نیست',
      });
    }

    const isValidCode = this.verifyOtpCode(body.mobile, body.code, otp.codeHash);
    if (!isValidCode) {
      otp.attempts += 1;
      await this.otpCodesRepository.save(otp);

      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_OTP',
        message: 'کد یکبار مصرف معتبر نیست',
      });
    }

    otp.consumedAt = new Date();
    await this.otpCodesRepository.save(otp);

    const user = await this.findOrCreateOtpUser(body.mobile);
    return this.createAuthResponse(user);
  }

  async refresh(payload: RefreshTokenRequest): Promise<IssuedAuthTokens> {
    const refreshToken = this.validateRefresh(payload).refreshToken;
    const { storedToken, user } = await this.getValidRefreshToken(refreshToken);

    await this.revokeRefreshToken(storedToken);
    return this.createAuthResponse(user);
  }

  async logout(accessToken?: string, refreshToken?: string): Promise<void> {
    if (!accessToken && !refreshToken) {
      return;
    }

    const session = accessToken
      ? this.sessionsByAccessToken.get(accessToken)
      : undefined;

    if (session) {
      await this.refreshTokensRepository.update(
        { tokenHash: session.refreshTokenHash, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      this.sessionsByAccessToken.delete(session.accessToken);
      return;
    }

    if (refreshToken) {
      await this.refreshTokensRepository.update(
        { tokenHash: this.hashToken(refreshToken), revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    }
  }

  async getUserByAccessToken(accessToken?: string): Promise<User | null> {
    return this.getUserByValidAccessToken(accessToken);
  }

  async authenticate(
    accessToken?: string,
    refreshToken?: string,
  ): Promise<AuthenticatedSession | null> {
    const user = await this.getUserByValidAccessToken(accessToken);
    if (user) {
      return { user };
    }

    if (!refreshToken) {
      return null;
    }

    const { storedToken, user: refreshedUser } =
      await this.getValidRefreshToken(refreshToken);
    await this.revokeRefreshToken(storedToken);
    const tokens = await this.createAuthResponse(refreshedUser);

    return {
      user: tokens.user,
      tokens,
    };
  }

  setAuthCookies(response: AuthenticatedResponse, tokens: IssuedAuthTokens): void {
    response.cookie(this.accessTokenCookieName, tokens.accessToken, {
      ...this.getBaseCookieOptions(),
      maxAge: this.accessTokenTtlMs,
    });
    response.cookie(this.refreshTokenCookieName, tokens.refreshToken, {
      ...this.getBaseCookieOptions(),
      maxAge: this.refreshTokenTtlMs,
    });
  }

  clearAuthCookies(response: AuthenticatedResponse): void {
    response.clearCookie(this.accessTokenCookieName, this.getBaseCookieOptions());
    response.clearCookie(
      this.refreshTokenCookieName,
      this.getBaseCookieOptions(),
    );
  }

  getAccessTokenFromRequest(
    request: AuthenticatedRequest,
  ): string | undefined {
    const authorization = request.headers?.authorization;
    if (typeof authorization === 'string') {
      const [scheme, token] = authorization.split(' ');
      if (scheme === 'Bearer' && token) {
        return token;
      }
    }

    return request.cookies?.[this.accessTokenCookieName];
  }

  getRefreshTokenFromRequest(
    request: AuthenticatedRequest,
  ): string | undefined {
    return request.cookies?.[this.refreshTokenCookieName];
  }

  private async createAuthResponse(user: UserEntity): Promise<IssuedAuthTokens> {
    const refreshToken = this.createToken();
    const refreshTokenHash = this.hashToken(refreshToken);
    const session: Session = {
      userId: user.id,
      accessToken: this.createToken(),
      refreshTokenHash,
      expiresAt: new Date(Date.now() + this.accessTokenTtlMs),
    };

    const storedRefreshToken = this.refreshTokensRepository.create({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + this.refreshTokenTtlMs),
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

  private async getUserByValidAccessToken(
    accessToken?: string,
  ): Promise<User | null> {
    if (!accessToken) {
      return null;
    }

    const session = this.sessionsByAccessToken.get(accessToken);
    if (!session) {
      return null;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      this.sessionsByAccessToken.delete(accessToken);
      return null;
    }

    const user = await this.usersRepository.findOne({
      where: { id: session.userId },
    });

    return user ? this.toPublicUser(user) : null;
  }

  private async getValidRefreshToken(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokensRepository.findOne({
      where: { tokenHash, revokedAt: IsNull() },
      relations: { user: true },
    });
    const user = storedToken?.user;

    if (
      !storedToken ||
      !user ||
      (storedToken.expiresAt && storedToken.expiresAt.getTime() <= Date.now())
    ) {
      if (storedToken) {
        await this.revokeRefreshToken(storedToken);
      }

      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'توکن تازه سازی معتبر نیست',
      });
    }

    return { storedToken, user };
  }

  private async revokeRefreshToken(
    refreshToken: RefreshTokenEntity,
  ): Promise<void> {
    refreshToken.revokedAt = new Date();
    await this.refreshTokensRepository.save(refreshToken);
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

  private validateRequestOtp(payload: RequestOtpRequest): RequestOtpRequest {
    const fields: Record<string, string> = {};
    const mobile = payload?.mobile?.trim();

    if (!this.isValidMobile(mobile)) {
      fields.mobile = 'شماره موبایل معتبر نیست';
    }

    this.throwValidation(fields);
    return { mobile };
  }

  private validateVerifyOtp(payload: VerifyOtpRequest): VerifyOtpRequest {
    const fields: Record<string, string> = {};
    const mobile = payload?.mobile?.trim();
    const code = payload?.code?.trim();

    if (!this.isValidMobile(mobile)) {
      fields.mobile = 'شماره موبایل معتبر نیست';
    }

    if (!code || !new RegExp(`^\\d{${this.otpLength}}$`).test(code)) {
      fields.code = 'کد یکبار مصرف معتبر نیست';
    }

    this.throwValidation(fields);
    return { mobile, code };
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
    return isValidIranMobile(mobile);
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

  private createOtpCode(): string {
    const max = 10 ** this.otpLength;
    const value = Number.parseInt(randomBytes(4).toString('hex'), 16) % max;
    return value.toString().padStart(this.otpLength, '0');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private hashOtpCode(mobile: string, code: string): string {
    return this.hashToken(`${mobile}:${code}`);
  }

  private verifyOtpCode(
    mobile: string,
    code: string,
    storedHash: string,
  ): boolean {
    const hash = Buffer.from(this.hashOtpCode(mobile, code), 'hex');
    const stored = Buffer.from(storedHash, 'hex');
    return hash.length === stored.length && timingSafeEqual(hash, stored);
  }

  private async findOrCreateOtpUser(mobile: string): Promise<UserEntity> {
    const existingUser = await this.usersRepository.findOne({
      where: { mobile },
    });

    if (existingUser) {
      return existingUser;
    }

    const user = this.usersRepository.create({
      fullName: `کاربر ${mobile}`,
      mobile,
      role: 'donor',
      passwordHash: this.hashPassword(this.createToken()),
    });

    return this.usersRepository.save(user);
  }

  private getBaseCookieOptions() {
    return {
      httpOnly: this.configService.get<boolean>('auth.cookieHttpOnly', true),
      sameSite: this.configService.get<'lax' | 'strict' | 'none'>(
        'auth.cookieSameSite',
        'lax',
      ),
      secure: this.configService.get<boolean>('auth.cookieSecure', false),
      path: this.configService.get<string>('auth.cookiePath', '/'),
    };
  }

  private get accessTokenCookieName() {
    return this.configService.get<string>(
      'auth.accessTokenCookieName',
      ACCESS_TOKEN_COOKIE,
    );
  }

  private get refreshTokenCookieName() {
    return this.configService.get<string>(
      'auth.refreshTokenCookieName',
      REFRESH_TOKEN_COOKIE,
    );
  }

  private get accessTokenTtlMs() {
    return this.configService.get<number>('auth.accessTokenTtlMs', 60 * 60 * 1000);
  }

  private get refreshTokenTtlMs() {
    return this.configService.get<number>(
      'auth.refreshTokenTtlMs',
      7 * 24 * 60 * 60 * 1000,
    );
  }

  private get otpTtlMs() {
    return this.configService.get<number>('auth.otpTtlMs', 2 * 60 * 1000);
  }

  private get otpLength() {
    return this.configService.get<number>('auth.otpLength', 6);
  }

  private get otpMaxAttempts() {
    return this.configService.get<number>('auth.otpMaxAttempts', 5);
  }
}
