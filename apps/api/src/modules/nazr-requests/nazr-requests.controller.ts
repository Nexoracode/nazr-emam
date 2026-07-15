import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
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
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { NazrRequestsService } from './nazr-requests.service';
import {
  CreateNazrRequestDto,
  NazrRequestDto,
  PaginatedNazrRequestDto,
} from './dto/nazr-request.dto';

@ApiTags('nazr-requests')
@Controller('nazr-requests')
export class NazrRequestsController {
  constructor(private readonly service: NazrRequestsService) {}

  @ApiBearerAuth()
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'ثبت درخواست نذر',
    description:
      'درخواست نذر را برای کاربر واردشده ثبت می‌کند. کد رهگیری بعد از تکمیل پرداخت به کاربر نمایش داده می‌شود.',
  })
  @ApiBody({ type: CreateNazrRequestDto })
  @ApiCreatedResponse({ type: NazrRequestDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'VALIDATION_ERROR' })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'UNAUTHORIZED' })
  @Post()
  async create(
    @Body() body: CreateNazrRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.create(body, request.user!);
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

}
