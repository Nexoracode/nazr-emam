import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { HealthResponseDto, ProjectInfoDto } from './app.dto';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({
    summary: 'بررسی سلامت سرویس',
    description: 'وضعیت API و زمان پاسخ را برمی گرداند.',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @ApiOperation({
    summary: 'اطلاعات پروژه',
    description: 'اطلاعات پایه پروژه و جریان کلی کار را برمی گرداند.',
  })
  @ApiOkResponse({ type: ProjectInfoDto })
  @Get('project')
  getProject() {
    return this.appService.getProject();
  }
}
