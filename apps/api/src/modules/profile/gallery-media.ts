import { ConfigService } from '@nestjs/config';
import type { GalleryAsset } from '@nazr-emam/shared';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { GalleryAssetEntity } from './entities/gallery-asset.entity';

// Only inspect files written by our local uploader. Remote/FTP URLs are never fetched.
async function fileAvailable(url: string, config: ConfigService): Promise<boolean> {
  const base = config.getOrThrow<string>('media.publicBaseUrl').replace(/\/$/, '');
  const prefix = `${base}/uploads/`;
  if (!url.startsWith(prefix)) return true;
  const ftpBase = config.get<string>('media.ftp.publicBaseUrl')?.replace(/\/$/, '');
  if (ftpBase && url.startsWith(ftpBase + '/')) return true;
  const filename = url.slice(prefix.length);
  if (!/^[\w.-]+$/.test(filename) || filename === '.' || filename === '..') return false;
  try {
    return (await stat(join(config.getOrThrow<string>('media.uploadDir'), filename))).isFile();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function galleryAsset(item: GalleryAssetEntity, config: ConfigService): Promise<GalleryAsset> {
  const [available, hasThumbnail] = await Promise.all([
    fileAvailable(item.fileUrl, config),
    item.thumbnailUrl ? fileAvailable(item.thumbnailUrl, config) : false,
  ]);
  return {
    id: item.id, title: item.title, nazrTypeId: item.nazrTypeId, placement: item.placement,
    type: item.type, fileUrl: item.fileUrl, fileAvailable: available,
    thumbnailUrl: hasThumbnail ? item.thumbnailUrl : null,
    collectionTitle: item.collectionTitle ?? null,
    coverSelectedAt: item.coverSelectedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function publicGallery(items: GalleryAssetEntity[], config: ConfigService): Promise<GalleryAsset[]> {
  const assets = await Promise.all(items.map(item => galleryAsset(item, config)));
  return assets.filter(item => item.fileAvailable);
}
