import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Money, NazrRequestStatus } from '@nazr-emam/shared';
import { UserEntity } from '../../auth/entities/user.entity';
import { NazrTypeEntity } from '../../nazr-types/entities/nazr-type.entity';
import { PaymentEntity } from '../../payments/entities/payment.entity';
import { TicketEntity } from '../../tickets/entities/ticket.entity';

@Entity('nazr_requests')
export class NazrRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'tracking_code', length: 40 })
  trackingCode!: string;

  @Column({ name: 'user_id', type: 'varchar', nullable: true })
  userId!: string | null;

  @ManyToOne(() => UserEntity, (user) => user.nazrRequests, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity | null;

  @Column({ name: 'nazr_type_id' })
  nazrTypeId!: string;

  @ManyToOne(() => NazrTypeEntity, (nazrType) => nazrType.nazrRequests, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'nazr_type_id' })
  nazrType!: NazrTypeEntity;

  @Column({ name: 'donor_full_name', length: 160 })
  donorFullName!: string;

  @Column({ name: 'donor_mobile', length: 20 })
  donorMobile!: string;

  @Column({
    name: 'donor_national_code',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  donorNationalCode!: string | null;

  @Column({ type: 'json' })
  amount!: Money;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'is_anonymous', default: false })
  isAnonymous!: boolean;

  @Column({
    type: 'enum',
    enum: [
      'draft',
      'submitted',
      'awaiting_payment',
      'payment_pending_review',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'rejected',
    ],
    default: 'submitted',
  })
  status!: NazrRequestStatus;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => PaymentEntity, (payment) => payment.nazrRequest)
  payments!: PaymentEntity[];

  @OneToMany(() => TicketEntity, (ticket) => ticket.nazrRequest)
  tickets!: TicketEntity[];
}
