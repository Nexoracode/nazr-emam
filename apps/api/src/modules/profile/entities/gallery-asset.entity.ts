import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { GalleryAssetPlacement, GalleryAssetType } from '@nazr-emam/shared';
import { NazrTypeEntity } from '../../nazr-types/entities/nazr-type.entity';

@Entity('gallery_assets')
export class GalleryAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'nazr_type_id', type: 'varchar', nullable: true })
  nazrTypeId!: string | null;

  @ManyToOne(() => NazrTypeEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nazr_type_id' })
  nazrType!: NazrTypeEntity | null;

  @Column({ length: 180 })
  title!: string;

  @Column({ type: 'enum', enum: ['image', 'video'] })
  type!: GalleryAssetType;

  @Column({ type: 'enum', enum: ['intro', 'gallery'], default: 'gallery' })
  placement!: GalleryAssetPlacement;

  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl!: string;

  @Column({ name: 'thumbnail_url', type: 'varchar', length: 500, nullable: true })
  thumbnailUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
