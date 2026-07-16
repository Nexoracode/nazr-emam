import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { CrmActivityType } from '@nazr-emam/shared';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('crm_activities')
export class CrmActivityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'enum', enum: ['call', 'note', 'payment', 'ticket', 'status'] })
  type!: CrmActivityType;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ name: 'created_by', length: 160 })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
