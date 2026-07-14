import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import {
  ACCESS_TOKEN_COOKIE,
  AuthService,
  REFRESH_TOKEN_COOKIE,
} from './auth.service';
import type {
  AuthenticatedRequest,
  AuthenticatedResponse,
} from './auth.types';
import {
  AuthResponseDto,
  LoginRequestDto,
  OtpRequestResponseDto,
  RefreshTokenRequestDto,
  RequestOtpRequestDto,
  RegisterRequestDto,
  VerifyOtpRequestDto,
  UserDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'ثبت نام کاربر',
    description:
      'کاربر جدید donor می سازد و accessToken و refreshToken را فقط در cookie ذخیره می کند.',
  })
  @ApiBody({ type: RegisterRequestDto })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_ERROR' })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'MOBILE_TAKEN' })
  @Public()
  @Post('register')
  async register(
    @Body() body: RegisterRequestDto,
    @Res({ passthrough: true }) response: AuthenticatedResponse,
  ) {
    const authResponse = await this.authService.register(body);
    this.authService.setAuthCookies(response, authResponse);
    return { user: authResponse.user };
  }

  @ApiOperation({
    summary: 'ورود کاربر',
    description:
      'با موبایل و رمز عبور وارد می شود و accessToken و refreshToken فقط در cookie ذخیره می شوند.',
  })
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_ERROR' })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'INVALID_CREDENTIALS' })
  @Public()
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() body: LoginRequestDto,
    @Res({ passthrough: true }) response: AuthenticatedResponse,
  ) {
    const authResponse = await this.authService.login(body);
    this.authService.setAuthCookies(response, authResponse);
    return { user: authResponse.user };
  }

  @ApiOperation({
    summary: 'درخواست کد ورود',
    description:
      'برای شماره موبایل یک کد یکبار مصرف صادر می کند. در محیط development کد در لاگ سرور چاپ می شود.',
  })
  @ApiBody({ type: RequestOtpRequestDto })
  @ApiOkResponse({ type: OtpRequestResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_ERROR' })
  @Public()
  @HttpCode(200)
  @Post('otp/request')
  requestOtp(@Body() body: RequestOtpRequestDto) {
    return this.authService.requestOtp(body);
  }

  @ApiOperation({
    summary: 'ورود با کد یکبار مصرف',
    description:
      'کد OTP را تایید می کند و accessToken و refreshToken را فقط در cookie ذخیره می کند.',
  })
  @ApiBody({ type: VerifyOtpRequestDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_ERROR' })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'INVALID_OTP' })
  @Public()
  @HttpCode(200)
  @Post('otp/verify')
  async verifyOtp(
    @Body() body: VerifyOtpRequestDto,
    @Res({ passthrough: true }) response: AuthenticatedResponse,
  ) {
    const authResponse = await this.authService.verifyOtp(body);
    this.authService.setAuthCookies(response, authResponse);
    return { user: authResponse.user };
  }

  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'تازه سازی توکن',
    description:
      'با refreshToken معتبر از body یا cookie، accessToken و refreshToken جدید را فقط در cookie ذخیره می کند.',
  })
  @ApiBody({ type: RefreshTokenRequestDto, required: false })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_ERROR' })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'INVALID_REFRESH_TOKEN' })
  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Body() body: Partial<RefreshTokenRequestDto>,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: AuthenticatedResponse,
  ) {
    const authResponse = await this.authService.refresh({
      refreshToken:
        body?.refreshToken ??
        this.authService.getRefreshTokenFromRequest(request) ??
        '',
    });
    this.authService.setAuthCookies(response, authResponse);
    return { user: authResponse.user };
  }

  @ApiBearerAuth()
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'خروج کاربر',
    description: 'نشست فعلی را حذف و cookieهای auth را پاک می کند.',
  })
  @ApiNoContentResponse({ description: 'خروج موفق' })
  @HttpCode(204)
  @Delete('logout')
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: AuthenticatedResponse,
  ) {
    await this.authService.logout(
      this.authService.getAccessTokenFromRequest(request),
      this.authService.getRefreshTokenFromRequest(request),
    );
    this.authService.clearAuthCookies(response);
  }

  @ApiBearerAuth()
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'دریافت کاربر فعلی',
    description:
      'اطلاعات کاربر لاگین شده را از accessToken برمی گرداند. اگر accessToken منقضی شده باشد و refreshToken معتبر باشد، خودکار refresh می شود.',
  })
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'UNAUTHORIZED' })
  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }

}
