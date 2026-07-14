import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TicketMessage } from '@nazr-emam/shared';
import { TicketEntity } from './ticket.entity';

@Entity('ticket_messages')
export class TicketMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ticket_id' })
  ticketId!: string;

  @ManyToOne(() => TicketEntity, (ticket) => ticket.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: TicketEntity;

  @Column({ type: 'text' })
  body!: string;

  @Column({ name: 'author_type', type: 'enum', enum: ['user', 'support'] })
  authorType!: TicketMessage['authorType'];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
