import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PublicHomeService } from './public-home.service';

@ApiTags('public-home')
@Public()
@Controller('public/home')
export class PublicHomeController {
  constructor(private readonly service: PublicHomeService) {}

  @Get()
  @ApiOperation({ summary: 'داده‌های عمومی صفحه اصلی' })
  getHome() {
    return this.service.getHome();
  }
}
