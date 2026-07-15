import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { UserRole } from '@nazr-emam/shared';
import type { UserPlatform } from '@nazr-emam/shared';
import { NazrRequestEntity } from '../../nazr-requests/entities/nazr-request.entity';
import { NotificationEntity } from '../../notifications/entities/notification.entity';
import { TicketEntity } from '../../tickets/entities/ticket.entity';
import { RefreshTokenEntity } from './refresh-token.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'full_name', length: 160 })
  fullName!: string;

  @Index({ unique: true })
  @Column({ length: 20 })
  mobile!: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash!: string;

  @Column({ name: 'eita_number', type: 'varchar', length: 40, nullable: true })
  eitaNumber!: string | null;

  @Column({ name: 'active_platforms', type: 'json', nullable: true })
  activePlatforms!: UserPlatform[] | null;

  @Column({ name: 'motivational_target', type: 'text', nullable: true })
  motivationalTarget!: string | null;

  @Column({ type: 'enum', enum: ['donor', 'admin'], default: 'donor' })
  role!: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => RefreshTokenEntity, (refreshToken) => refreshToken.user)
  refreshTokens!: RefreshTokenEntity[];

  @OneToMany(() => NazrRequestEntity, (nazrRequest) => nazrRequest.user)
  nazrRequests!: NazrRequestEntity[];

  @OneToMany(() => TicketEntity, (ticket) => ticket.user)
  tickets!: TicketEntity[];

  @OneToMany(() => NotificationEntity, (notification) => notification.user)
  notifications!: NotificationEntity[];
}
