import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NazrRequestEntity } from '../nazr-requests/entities/nazr-request.entity';
import { WalletTransactionEntity } from '../profile/entities/wallet-transaction.entity';
import { WalletEntity } from '../profile/entities/wallet.entity';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentReceiptEntity } from './entities/payment-receipt.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NazrRequestEntity,
      PaymentEntity,
      PaymentReceiptEntity,
      WalletEntity,
      WalletTransactionEntity,
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
