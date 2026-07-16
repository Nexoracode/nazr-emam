import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { NazrRequestEntity } from '../nazr-requests/entities/nazr-request.entity';
import { NazrTypeEntity } from '../nazr-types/entities/nazr-type.entity';
import { NotificationEntity } from '../notifications/entities/notification.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { GalleryAssetEntity } from '../profile/entities/gallery-asset.entity';
import { WalletEntity } from '../profile/entities/wallet.entity';
import { TicketEntity } from '../tickets/entities/ticket.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CallTaskEntity } from './entities/call-task.entity';
import { CrmActivityEntity } from './entities/crm-activity.entity';
import { CrmProfileEntity } from './entities/crm-profile.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      UserEntity,
      NazrRequestEntity,
      NazrTypeEntity,
      PaymentEntity,
      TicketEntity,
      NotificationEntity,
      GalleryAssetEntity,
      WalletEntity,
      CrmProfileEntity,
      CrmActivityEntity,
      CallTaskEntity,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
