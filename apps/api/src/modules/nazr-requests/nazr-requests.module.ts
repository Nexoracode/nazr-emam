import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NazrRequestEntity } from './entities/nazr-request.entity';
import { NazrRequestsController } from './nazr-requests.controller';
import { NazrRequestsService } from './nazr-requests.service';

@Module({
  imports: [TypeOrmModule.forFeature([NazrRequestEntity])],
  controllers: [NazrRequestsController],
  providers: [NazrRequestsService],
})
export class NazrRequestsModule {}
