import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Money } from '@nazr-emam/shared';
import { NazrRequestEntity } from '../../nazr-requests/entities/nazr-request.entity';

@Entity('nazr_types')
export class NazrTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 120 })
  slug!: string;

  @Column({ length: 160 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'suggested_amount', type: 'json', nullable: true })
  suggestedAmount!: Money | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => NazrRequestEntity, (nazrRequest) => nazrRequest.nazrType)
  nazrRequests!: NazrRequestEntity[];
}
