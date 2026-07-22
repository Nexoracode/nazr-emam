import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { NazrRequestEntity } from '../../nazr-requests/entities/nazr-request.entity';
import { NazrTypeEntity } from '../../nazr-types/entities/nazr-type.entity';
import { PaymentEntity } from '../../payments/entities/payment.entity';

@Entity('admin_eitaa_receipts')
export class EitaaReceiptEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Index({ unique: true })
  @Column({ name: 'nazr_request_id' })
  nazrRequestId!: string;

  @OneToOne(() => NazrRequestEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'nazr_request_id' })
  nazrRequest!: NazrRequestEntity;

  @Column({ name: 'nazr_type_id' })
  nazrTypeId!: string;

  @ManyToOne(() => NazrTypeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'nazr_type_id' })
  nazrType!: NazrTypeEntity;

  @Index({ unique: true })
  @Column({ name: 'payment_id' })
  paymentId!: string;

  @OneToOne(() => PaymentEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_id' })
  payment!: PaymentEntity;

  @Column({ name: 'eita_number', type: 'varchar', length: 40, nullable: true })
  eitaNumber!: string | null;

  @Index({ unique: true })
  @Column({ name: 'eitaa_message_url', type: 'varchar', length: 500, nullable: true })
  eitaaMessageUrl!: string | null;

  @Column({ name: 'received_at', type: 'datetime' })
  receivedAt!: Date;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'recorded_by_user_id' })
  recordedByUserId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recorded_by_user_id' })
  recordedByUser!: UserEntity;

  @Column({ name: 'recorded_by', length: 160 })
  recordedBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
