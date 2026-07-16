import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { NazrRequestEntity } from '../nazr-requests/entities/nazr-request.entity';
import { NotificationEntity } from '../notifications/entities/notification.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { TicketEntity } from '../tickets/entities/ticket.entity';
import { GalleryAssetEntity } from './entities/gallery-asset.entity';
import { InvitationCardEntity } from './entities/invitation-card.entity';
import { WalletTransactionEntity } from './entities/wallet-transaction.entity';
import { WalletEntity } from './entities/wallet.entity';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { WalletMonthlyService } from './wallet-monthly.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      NazrRequestEntity,
      PaymentEntity,
      NotificationEntity,
      TicketEntity,
      WalletEntity,
      WalletTransactionEntity,
      GalleryAssetEntity,
      InvitationCardEntity,
    ]),
  ],
  controllers: [ProfileController],
  providers: [ProfileService, WalletMonthlyService],
})
export class ProfileModule {}
