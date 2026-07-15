import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth.service';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CreateNotificationDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@ApiCookieAuth(ACCESS_TOKEN_COOKIE)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @ApiOperation({ summary: 'اعلان‌های کاربر' })
  @Get()
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

  @ApiOperation({ summary: 'ساخت اعلان توسط مدیر' })
  @Roles('admin')
  @Post()
  create(@Body() body: CreateNotificationDto) {
    return this.service.create(body);
  }

  @ApiOperation({ summary: 'خوانده‌شدن اعلان' })
  @HttpCode(204)
  @Post(':id/read')
  markAsRead(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.markAsRead(id, request.user!.id);
  }
}
