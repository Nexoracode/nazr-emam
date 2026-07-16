import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CallTaskStatus, Money } from '@nazr-emam/shared';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('call_tasks')
@Index(['userId', 'period'], { unique: true })
export class CallTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ length: 7 })
  period!: string;

  @Column({ name: 'due_date', type: 'datetime' })
  dueDate!: Date;

  @Column({ name: 'expected_amount', type: 'json', nullable: true })
  expectedAmount!: Money | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'contacted', 'promised', 'paid', 'unreachable', 'cancelled'],
    default: 'pending',
  })
  status!: CallTaskStatus;

  @Column({ name: 'assigned_to', type: 'varchar', length: 160, nullable: true })
  assignedTo!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'text', nullable: true })
  outcome!: string | null;

  @Column({ name: 'contacted_at', type: 'datetime', nullable: true })
  contactedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
