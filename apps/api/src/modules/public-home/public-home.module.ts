import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { NazrRequestEntity } from '../nazr-requests/entities/nazr-request.entity';
import { NazrTypeEntity } from '../nazr-types/entities/nazr-type.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { GalleryAssetEntity } from '../profile/entities/gallery-asset.entity';
import { PublicHomeController } from './public-home.controller';
import { PublicHomeService } from './public-home.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      NazrRequestEntity,
      NazrTypeEntity,
      PaymentEntity,
      GalleryAssetEntity,
    ]),
  ],
  controllers: [PublicHomeController],
  providers: [PublicHomeService],
})
export class PublicHomeModule {}
