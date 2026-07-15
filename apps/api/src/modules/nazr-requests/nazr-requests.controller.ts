import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth.service';
import { AuthService } from '../auth/auth.service';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { Public } from '../../common/decorators/public.decorator';
import type {
  AuthenticatedRequest,
  AuthenticatedResponse,
} from '../auth/auth.types';
import { NazrRequestsService } from './nazr-requests.service';
import {
  CreateNazrRequestDto,
  NazrRequestDto,
  PaginatedNazrRequestDto,
} from './dto/nazr-request.dto';

@ApiTags('nazr-requests')
@Controller('nazr-requests')
export class NazrRequestsController {
  constructor(
    private readonly service: NazrRequestsService,
    private readonly authService: AuthService,
  ) {}

  @ApiOperation({
    summary: 'ثبت درخواست نذر',
    description:
      'درخواست نذر را برای کاربر مهمان یا کاربر واردشده ثبت می‌کند و کد رهگیری برمی‌گرداند.',
  })
  @ApiBody({ type: CreateNazrRequestDto })
  @ApiCreatedResponse({ type: NazrRequestDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_ERROR' })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'UNAUTHORIZED' })
  @Public()
  @Post()
  async create(
    @Body() body: CreateNazrRequestDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: AuthenticatedResponse,
  ) {
    const userId = await this.getOptionalUserId(request, response);
    return this.service.create(body, userId);
  }

  @ApiBearerAuth()
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({ summary: 'نذرهای من', description: 'لیست درخواست‌های نذر کاربر لاگین‌شده.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: PaginatedNazrRequestDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto })
  @Get('mine')
  getMine(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getMine(
      req.user!.id,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 12,
    );
  }

  private async getOptionalUserId(
    request: AuthenticatedRequest,
    response: AuthenticatedResponse,
  ): Promise<string | null> {
    const accessToken = this.authService.getAccessTokenFromRequest(request);
    const refreshToken = this.authService.getRefreshTokenFromRequest(request);

    if (!accessToken && !refreshToken) {
      return null;
    }

    try {
      const authenticated = await this.authService.authenticate(
        accessToken,
        refreshToken,
      );

      if (!authenticated) {
        return null;
      }

      if (authenticated.tokens) {
        this.authService.setAuthCookies(response, authenticated.tokens);
      }

      return authenticated.user.id;
    } catch {
      return null;
    }
  }
}
