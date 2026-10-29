import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from '../modules/payments/entities/payment.entity';
import { CrmConfigService } from './crm.config';
import { Crm24ClientService } from './crm24-client.service';
import { CrmSyncService } from './crm-sync.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity])],
  providers: [CrmConfigService, Crm24ClientService, CrmSyncService],
  exports: [CrmSyncService],
})
export class CrmModule {}
