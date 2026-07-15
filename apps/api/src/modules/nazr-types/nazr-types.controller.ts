import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { NazrTypeDto } from './dto/nazr-type.dto';
import { NazrTypesService } from './nazr-types.service';

@ApiTags('nazr-types')
@Public()
@Controller('nazr-types')
export class NazrTypesController {
  constructor(private readonly service: NazrTypesService) {}

  @ApiOperation({
    summary: 'لیست نوع‌های فعال نذر',
    description: 'نوع‌های فعال نذر را برای نمایش در فرم ثبت نذر برمی‌گرداند.',
  })
  @ApiOkResponse({ type: [NazrTypeDto] })
  @Get()
  findActive() {
    return this.service.findActive();
  }
}
