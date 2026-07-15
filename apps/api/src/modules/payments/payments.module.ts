import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NazrRequestEntity } from '../nazr-requests/entities/nazr-request.entity';
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
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
