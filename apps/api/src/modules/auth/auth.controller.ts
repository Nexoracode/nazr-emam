import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';
import {
  AuthResponseDto,
  LoginRequestDto,
  RefreshTokenRequestDto,
  RegisterRequestDto,
  UserDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'ثبت نام کاربر',
    description: 'کاربر جدید donor می سازد و accessToken و refreshToken برمی گرداند.',
  })
  @ApiBody({ type: RegisterRequestDto })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_ERROR' })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'MOBILE_TAKEN' })
  @Post('register')
  register(@Body() body: RegisterRequestDto) {
    return this.authService.register(body);
  }

  @ApiOperation({
    summary: 'ورود کاربر',
    description: 'با موبایل و رمز عبور وارد می شود و accessToken و refreshToken می گیرد.',
  })
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_ERROR' })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'INVALID_CREDENTIALS' })
  @HttpCode(200)
  @Post('login')
  login(@Body() body: LoginRequestDto) {
    return this.authService.login(body);
  }

  @ApiOperation({
    summary: 'تازه سازی توکن',
    description: 'با refreshToken معتبر، accessToken و refreshToken جدید صادر می کند.',
  })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_ERROR' })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'INVALID_REFRESH_TOKEN' })
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() body: RefreshTokenRequestDto) {
    return this.authService.refresh(body);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'خروج کاربر',
    description: 'نشست مرتبط با accessToken ارسالی را حذف می کند.',
  })
  @ApiNoContentResponse({ description: 'خروج موفق' })
  @HttpCode(204)
  @Delete('logout')
  logout(@Req() request: AuthenticatedRequest) {
    this.authService.logout(this.extractBearerToken(request));
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'دریافت کاربر فعلی',
    description: 'اطلاعات کاربر لاگین شده را از accessToken برمی گرداند.',
  })
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'UNAUTHORIZED' })
  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }

  private extractBearerToken(request: AuthenticatedRequest): string | undefined {
    const authorization = request.headers?.authorization;
    if (typeof authorization !== 'string') {
      return undefined;
    }

    const [scheme, token] = authorization.split(' ');
    return scheme === 'Bearer' && token ? token : undefined;
  }
}
