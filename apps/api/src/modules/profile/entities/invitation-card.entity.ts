import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('invitation_cards')
export class InvitationCardEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'friend_name', length: 120 })
  friendName!: string;

  @Column({ name: 'friend_mobile', type: 'varchar', length: 20, nullable: true })
  friendMobile!: string | null;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'download_text', type: 'text' })
  downloadText!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
