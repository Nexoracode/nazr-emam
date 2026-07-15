import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth.service';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CreateTicketDto, ReplyTicketDto } from './dto/ticket.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiBearerAuth()
@ApiCookieAuth(ACCESS_TOKEN_COOKIE)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @ApiOperation({ summary: 'ثبت تیکت کاربر یا مهمان' })
  @Post()
  create(@Body() body: CreateTicketDto, @Req() request: AuthenticatedRequest) {
    return this.service.create(body, request.user!);
  }

  @ApiOperation({ summary: 'تیکت‌های کاربر' })
  @Get('mine')
  getMine(
    @Req() request: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getMine(
      request.user!.id,
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
    );
  }

  @ApiOperation({ summary: 'لیست همه تیکت‌ها برای مدیر' })
  @Roles('admin')
  @Get()
  getAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.getAll(
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
    );
  }

  @ApiOperation({ summary: 'پاسخ به تیکت' })
  @Post(':id/reply')
  reply(
    @Param('id') id: string,
    @Body() body: ReplyTicketDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.reply(id, body.body, request.user!);
  }

  @ApiOperation({ summary: 'بستن تیکت' })
  @HttpCode(204)
  @Post(':id/close')
  close(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.close(id, request.user!);
  }
}
