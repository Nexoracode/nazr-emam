import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NazrTypeEntity } from '../nazr-types/entities/nazr-type.entity';
import { NazrRequestEntity } from './entities/nazr-request.entity';
import { NazrRequestsController } from './nazr-requests.controller';
import { NazrRequestsService } from './nazr-requests.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([NazrRequestEntity, NazrTypeEntity])],
  controllers: [NazrRequestsController],
  providers: [NazrRequestsService],
})
export class NazrRequestsModule {}
