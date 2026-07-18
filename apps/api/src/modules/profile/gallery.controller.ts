import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ProfileService } from './profile.service';

@ApiTags('gallery')
@Public()
@Controller('gallery')
export class GalleryController {
  constructor(private readonly service: ProfileService) {}

  @ApiOperation({ summary: 'گالری عمومی تصاویر و ویدئوها' })
  @ApiOkResponse({ description: 'رسانه‌های عمومی از جدیدترین به قدیمی‌ترین' })
  @Get()
  getGallery(@Query('nazrTypeId') nazrTypeId?: string) {
    return this.service.getGallery(nazrTypeId);
  }
}
