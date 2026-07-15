import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Money, WalletTransactionType } from '@nazr-emam/shared';
import { WalletEntity } from './wallet.entity';

@Entity('wallet_transactions')
export class WalletTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'wallet_id' })
  walletId!: string;

  @ManyToOne(() => WalletEntity, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletEntity;

  @Column({ type: 'enum', enum: ['charge', 'deduction', 'payment', 'refund'] })
  type!: WalletTransactionType;

  @Column({ type: 'json' })
  amount!: Money;

  @Column({ type: 'varchar', length: 240 })
  description!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
