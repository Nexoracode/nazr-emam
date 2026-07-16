import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  CallTaskStatus,
  CreateCallTaskRequest,
  CreateCrmActivityRequest,
  CreateGalleryAssetRequest,
  CreateNotificationRequest,
  CreateNazrTypeRequest,
  GenerateMonthlyCallTasksRequest,
  NazrRequestStatus,
  PaymentStatus,
  UpdateCallTaskRequest,
  UpdateCrmProfileRequest,
  UpdateGalleryAssetRequest,
  UpdateNazrTypeRequest,
} from '@nazr-emam/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth.service';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@ApiCookieAuth(ACCESS_TOKEN_COOKIE)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @ApiOperation({ summary: 'داشبورد مدیریتی' })
  @Get('dashboard')
  dashboard() {
    return this.service.dashboard();
  }

  @ApiOperation({ summary: 'لیست کاربران و وضعیت CRM' })
  @Get('users')
  users(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('search') search?: string, @Query('stage') stage?: string) {
    return this.service.users(Number(page) || 1, Number(pageSize) || 20, search, stage as Parameters<AdminService['users']>[3]);
  }

  @ApiOperation({ summary: 'پرونده کامل مخاطب' })
  @Get('users/:id')
  userDetails(@Param('id') id: string) {
    return this.service.userDetails(id);
  }

  @ApiOperation({ summary: 'ویرایش وضعیت CRM مخاطب' })
  @Patch('users/:id/crm')
  updateCrm(@Param('id') id: string, @Body() body: UpdateCrmProfileRequest) {
    return this.service.updateCrm(id, body);
  }

  @ApiOperation({ summary: 'ثبت فعالیت در پرونده مخاطب' })
  @Post('users/:id/activities')
  addActivity(@Param('id') id: string, @Body() body: CreateCrmActivityRequest, @Req() request: AuthenticatedRequest) {
    return this.service.addActivity(id, body, request.user!);
  }

  @ApiOperation({ summary: 'لیست مدیریتی نذرها' })
  @Get('nazr-requests')
  requests(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('search') search?: string, @Query('status') status?: NazrRequestStatus) {
    return this.service.requests(Number(page) || 1, Number(pageSize) || 20, search, status);
  }

  @ApiOperation({ summary: 'لیست انواع نذر برای مدیریت' })
  @Get('nazr-types')
  nazrTypes() {
    return this.service.nazrTypes();
  }

  @ApiOperation({ summary: 'ساخت نوع نذر' })
  @Post('nazr-types')
  createNazrType(@Body() body: CreateNazrTypeRequest) {
    return this.service.createNazrType(body);
  }

  @ApiOperation({ summary: 'ویرایش نوع نذر' })
  @Patch('nazr-types/:id')
  updateNazrType(@Param('id') id: string, @Body() body: UpdateNazrTypeRequest) {
    return this.service.updateNazrType(id, body);
  }

  @ApiOperation({ summary: 'حذف نوع نذر استفاده‌نشده' })
  @HttpCode(204)
  @Delete('nazr-types/:id')
  deleteNazrType(@Param('id') id: string) {
    return this.service.deleteNazrType(id);
  }

  @ApiOperation({ summary: 'تغییر وضعیت نذر' })
  @Patch('nazr-requests/:id/status')
  updateRequestStatus(@Param('id') id: string, @Body() body: { status: NazrRequestStatus; adminNote?: string | null }) {
    return this.service.updateRequestStatus(id, body.status, body.adminNote);
  }

  @ApiOperation({ summary: 'لیست مدیریتی پرداخت‌ها' })
  @Get('payments')
  payments(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('search') search?: string, @Query('status') status?: PaymentStatus) {
    return this.service.payments(Number(page) || 1, Number(pageSize) || 20, search, status);
  }

  @ApiOperation({ summary: 'تایید پرداخت' })
  @Post('payments/:id/approve')
  approvePayment(@Param('id') id: string) {
    return this.service.setPaymentStatus(id, 'paid');
  }

  @ApiOperation({ summary: 'رد پرداخت' })
  @Post('payments/:id/reject')
  rejectPayment(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.service.setPaymentStatus(id, 'rejected', body.reason);
  }

  @ApiOperation({ summary: 'لیست تیکت‌های پشتیبانی' })
  @Get('tickets')
  tickets(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.tickets(Number(page) || 1, Number(pageSize) || 20);
  }

  @ApiOperation({ summary: 'لیست اعلان‌های ارسال‌شده' })
  @Get('notifications')
  notifications(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.notifications(Number(page) || 1, Number(pageSize) || 20);
  }

  @ApiOperation({ summary: 'ارسال اعلان عمومی یا اختصاصی' })
  @Post('notifications')
  createNotification(@Body() body: CreateNotificationRequest) {
    return this.service.createNotification(body);
  }

  @ApiOperation({ summary: 'لیست گالری' })
  @Get('gallery')
  gallery() {
    return this.service.gallery();
  }

  @ApiOperation({ summary: 'افزودن رسانه به گالری' })
  @Post('gallery')
  createGallery(@Body() body: CreateGalleryAssetRequest) {
    return this.service.createGallery(body);
  }

  @ApiOperation({ summary: 'ویرایش رسانه گالری' })
  @Patch('gallery/:id')
  updateGallery(@Param('id') id: string, @Body() body: UpdateGalleryAssetRequest) {
    return this.service.updateGallery(id, body);
  }

  @ApiOperation({ summary: 'حذف رسانه گالری' })
  @HttpCode(204)
  @Delete('gallery/:id')
  deleteGallery(@Param('id') id: string) {
    return this.service.deleteGallery(id);
  }

  @ApiOperation({ summary: 'لیست پیگیری‌های کال‌سنتر' })
  @Get('call-tasks')
  callTasks(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('status') status?: CallTaskStatus) {
    return this.service.callTasks(Number(page) || 1, Number(pageSize) || 30, status);
  }

  @ApiOperation({ summary: 'ساخت پیگیری‌های ماهانه برای پرداخت‌های دوره‌ای' })
  @Post('call-tasks/generate')
  generateCallTasks(@Body() body: GenerateMonthlyCallTasksRequest) {
    return this.service.generateCallTasks(body.period, body.dueDate);
  }

  @ApiOperation({ summary: 'ساخت پیگیری جدید' })
  @Post('call-tasks')
  createCallTask(@Body() body: CreateCallTaskRequest) {
    return this.service.createCallTask(body);
  }

  @ApiOperation({ summary: 'به‌روزرسانی نتیجه پیگیری' })
  @Patch('call-tasks/:id')
  updateCallTask(@Param('id') id: string, @Body() body: UpdateCallTaskRequest) {
    return this.service.updateCallTask(id, body);
  }
}
