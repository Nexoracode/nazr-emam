import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Money } from '@nazr-emam/shared';
import { UserEntity } from '../../auth/entities/user.entity';
import { WalletTransactionEntity } from './wallet-transaction.entity';

@Entity('wallets')
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', unique: true })
  userId!: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'json' })
  balance!: Money;

  @Column({ name: 'monthly_deduction_enabled', default: false })
  isMonthlyDeductionEnabled!: boolean;

  @Column({ name: 'monthly_deduction_amount', type: 'json', nullable: true })
  monthlyDeductionAmount!: Money | null;

  @Column({ name: 'next_monthly_deduction_at', type: 'datetime', nullable: true })
  nextMonthlyDeductionAt!: Date | null;

  @Column({ name: 'last_monthly_deduction_at', type: 'datetime', nullable: true })
  lastMonthlyDeductionAt!: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => WalletTransactionEntity, (transaction) => transaction.wallet)
  transactions!: WalletTransactionEntity[];
}
