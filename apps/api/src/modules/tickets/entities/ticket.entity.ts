import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { TicketStatus } from '@nazr-emam/shared';
import { UserEntity } from '../../auth/entities/user.entity';
import { NazrRequestEntity } from '../../nazr-requests/entities/nazr-request.entity';
import { TicketMessageEntity } from './ticket-message.entity';

@Entity('tickets')
export class TicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', nullable: true })
  userId!: string | null;

  @ManyToOne(() => UserEntity, (user) => user.tickets, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity | null;

  @Column({ name: 'guest_mobile', type: 'varchar', length: 20, nullable: true })
  guestMobile!: string | null;

  @Column({ length: 180 })
  subject!: string;

  @Column({ type: 'enum', enum: ['open', 'answered', 'closed'], default: 'open' })
  status!: TicketStatus;

  @Column({ name: 'nazr_request_id', type: 'varchar', nullable: true })
  nazrRequestId!: string | null;

  @ManyToOne(() => NazrRequestEntity, (nazrRequest) => nazrRequest.tickets, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'nazr_request_id' })
  nazrRequest!: NazrRequestEntity | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => TicketMessageEntity, (message) => message.ticket)
  messages!: TicketMessageEntity[];
}
