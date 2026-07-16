import { Body, Controller, Get, Patch, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth.service';
import type { AuthenticatedRequest } from '../auth/auth.types';
import {
  CreateInvitationCardDto,
  UpdateMotivationalTargetDto,
  UpdateUserProfileDetailsDto,
  UpdateWalletSettingsDto,
} from './dto/profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@ApiBearerAuth()
@ApiCookieAuth(ACCESS_TOKEN_COOKIE)
@Controller('profile')
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @ApiOperation({ summary: 'دریافت اطلاعات تکمیلی پروفایل کاربر' })
  @ApiOkResponse({ description: 'اطلاعات پروفایل' })
  @Get('details')
  getDetails(@Req() request: AuthenticatedRequest) {
    return this.service.getDetails(request.user!.id);
  }

  @ApiOperation({ summary: 'ویرایش اطلاعات تکمیلی پروفایل کاربر' })
  @Patch('details')
  updateDetails(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateUserProfileDetailsDto,
  ) {
    return this.service.updateDetails(request.user!.id, body);
  }

  @ApiOperation({ summary: 'خلاصه کامل پنل کاربری' })
  @Get('summary')
  getSummary(@Req() request: AuthenticatedRequest) {
    return this.service.getSummary(request.user!.id);
  }

  @ApiOperation({ summary: 'خلاصه مشارکت‌های کاربر در طرح‌های نذر' })
  @Get('contributions')
  getContributions(@Req() request: AuthenticatedRequest) {
    return this.service.getContributions(request.user!.id);
  }

  @ApiOperation({ summary: 'واریزهای کاربر با امکان جستجو و فیلتر تاریخ' })
  @Get('payments')
  getPayments(
    @Req() request: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getPayments(request.user!.id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      from,
      to,
    });
  }

  @ApiOperation({ summary: 'دریافت هدف شخصی کاربر' })
  @Get('goal')
  getGoal(@Req() request: AuthenticatedRequest) {
    return this.service.getGoal(request.user!.id);
  }

  @ApiOperation({ summary: 'ویرایش هدف شخصی کاربر' })
  @Patch('goal')
  updateGoal(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateMotivationalTargetDto,
  ) {
    return this.service.updateGoal(request.user!.id, body);
  }

  @ApiOperation({ summary: 'وضعیت باشگاه، امتیاز و ماموریت‌های کاربر' })
  @Get('club')
  getClub(@Req() request: AuthenticatedRequest) {
    return this.service.getClub(request.user!.id);
  }

  @ApiOperation({ summary: 'کیف پول کاربر' })
  @Get('wallet')
  getWallet(@Req() request: AuthenticatedRequest) {
    return this.service.getWallet(request.user!.id);
  }

  @ApiOperation({ summary: 'تنظیم برداشت ماهانه کیف پول' })
  @Patch('wallet')
  updateWallet(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateWalletSettingsDto,
  ) {
    return this.service.updateWalletSettings(request.user!.id, body);
  }

  @ApiOperation({ summary: 'تراکنش‌های کیف پول کاربر' })
  @Get('wallet/transactions')
  getWalletTransactions(@Req() request: AuthenticatedRequest) {
    return this.service.getWalletTransactions(request.user!.id);
  }

  @ApiOperation({ summary: 'گالری عکس و ویدئوهای قابل دریافت' })
  @Get('gallery')
  getGallery(@Query('nazrTypeId') nazrTypeId?: string) {
    return this.service.getGallery(nazrTypeId);
  }

  @ApiOperation({ summary: 'کارت‌های دعوت ساخته‌شده کاربر' })
  @Get('invitations')
  getInvitations(@Req() request: AuthenticatedRequest) {
    return this.service.getInvitationCards(request.user!.id);
  }

  @ApiOperation({ summary: 'ساخت کارت دعوت متنی قابل دانلود' })
  @Post('invitations')
  createInvitation(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateInvitationCardDto,
  ) {
    return this.service.createInvitationCard(request.user!.id, body);
  }
}
