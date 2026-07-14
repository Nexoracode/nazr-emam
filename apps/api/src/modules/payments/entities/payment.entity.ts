import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Money, PaymentMethod, PaymentStatus } from '@nazr-emam/shared';
import { NazrRequestEntity } from '../../nazr-requests/entities/nazr-request.entity';
import { PaymentReceiptEntity } from './payment-receipt.entity';

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'nazr_request_id' })
  nazrRequestId!: string;

  @ManyToOne(() => NazrRequestEntity, (nazrRequest) => nazrRequest.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'nazr_request_id' })
  nazrRequest!: NazrRequestEntity;

  @Column({ type: 'enum', enum: ['online', 'card_to_card', 'cash'] })
  method!: PaymentMethod;

  @Column({
    type: 'enum',
    enum: ['pending', 'paid', 'rejected', 'refunded'],
    default: 'pending',
  })
  status!: PaymentStatus;

  @Column({ type: 'json' })
  amount!: Money;

  @Column({
    name: 'transaction_reference',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  transactionReference!: string | null;

  @Column({ name: 'receipt_url', type: 'varchar', length: 500, nullable: true })
  receiptUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => PaymentReceiptEntity, (receipt) => receipt.payment)
  receipt!: PaymentReceiptEntity | null;
}
