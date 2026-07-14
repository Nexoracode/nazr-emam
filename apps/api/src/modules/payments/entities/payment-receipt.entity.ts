import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentEntity } from './payment.entity';

@Entity('payment_receipts')
export class PaymentReceiptEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'payment_id' })
  paymentId!: string;

  @OneToOne(() => PaymentEntity, (payment) => payment.receipt, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_id' })
  payment!: PaymentEntity;

  @Column({ name: 'file_url', length: 500 })
  fileUrl!: string;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt!: Date;
}
