import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NazrTypeEntity } from './entities/nazr-type.entity';
import { NazrTypesController } from './nazr-types.controller';
import { NazrTypesService } from './nazr-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([NazrTypeEntity])],
  controllers: [NazrTypesController],
  providers: [NazrTypesService],
})
export class NazrTypesModule {}
