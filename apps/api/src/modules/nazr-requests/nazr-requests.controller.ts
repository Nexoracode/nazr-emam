import { Controller, Get, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
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
import { PaginatedNazrRequestDto } from './dto/nazr-request.dto';

@ApiTags('nazr-requests')
@Controller('nazr-requests')
export class NazrRequestsController {
  constructor(private readonly service: NazrRequestsService) {}

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
