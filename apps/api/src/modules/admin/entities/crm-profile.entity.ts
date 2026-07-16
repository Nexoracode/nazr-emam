import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CrmStage } from '@nazr-emam/shared';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('crm_profiles')
export class CrmProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', unique: true })
  userId!: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({
    type: 'enum',
    enum: ['new', 'engaged', 'recurring', 'at_risk', 'inactive'],
    default: 'new',
  })
  stage!: CrmStage;

  @Column({ type: 'json', nullable: true })
  tags!: string[] | null;

  @Column({ name: 'assigned_to', type: 'varchar', length: 160, nullable: true })
  assignedTo!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'next_follow_up_at', type: 'datetime', nullable: true })
  nextFollowUpAt!: Date | null;

  @Column({ name: 'last_contact_at', type: 'datetime', nullable: true })
  lastContactAt!: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
