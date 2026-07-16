import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  Money,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@nazr-emam/shared';
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

  @Column({
    type: 'enum',
    enum: ['pending', 'completed', 'failed'],
    default: 'completed',
  })
  status!: WalletTransactionStatus;

  @Column({ type: 'json' })
  amount!: Money;

  @Column({ type: 'varchar', length: 240 })
  description!: string;

  @Column({ name: 'gateway_authority', type: 'varchar', length: 180, nullable: true })
  gatewayAuthority!: string | null;

  @Column({ name: 'transaction_reference', type: 'varchar', length: 180, nullable: true })
  transactionReference!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
