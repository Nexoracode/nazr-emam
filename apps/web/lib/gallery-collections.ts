import type { GalleryAsset, NazrType } from '@nazr-emam/shared';
import { planLandingContent } from './public-nazr-types';

export interface CollectionPhoto {
  src: string;
  preview: string;
  title: string;
}

export interface PhotoCollection {
  href: string;
  title: string;
  planTitle: string;
  cover: CollectionPhoto;
  photos: CollectionPhoto[];
}

// Existing, ungrouped photos belong to their plan's default album.
// The plan scope keeps equal album titles from different plans separate.
export function buildCollections(plans: NazrType[], assets: GalleryAsset[]): PhotoCollection[] {
  const collections = new Map<string, PhotoCollection>();
  const planById = new Map(plans.map(plan => [plan.id, plan]));
  const coverDates = new Map<string, string>();

  function addPhoto(scope: string, planTitle: string, album: string | null, photo: CollectionPhoto, pickedAt?: string | null) {
    const href = '/gallery/' + scope + (album ? '/' + encodeURIComponent(album) : '');
    let collection = collections.get(href);
    if (!collection) {
      collection = { href, title: album || planTitle, planTitle, photos: [], cover: photo };
      collections.set(href, collection);
    }
    collection.photos.push(photo);
    if (pickedAt && pickedAt > (coverDates.get(href) || '')) {
      collection.cover = photo;
      coverDates.set(href, pickedAt);
    }
  }

  for (const asset of assets) {
    if (asset.placement !== 'gallery' || asset.type !== 'image' || asset.fileAvailable === false) continue;
    const plan = asset.nazrTypeId ? planById.get(asset.nazrTypeId) : undefined;
    const scope = plan ? 'plan/' + encodeURIComponent(plan.slug)
      : asset.nazrTypeId ? 'archive/' + encodeURIComponent(asset.nazrTypeId) : 'general';
    const title = plan?.title || (asset.nazrTypeId ? 'گزارش طرح' : 'گزارش‌های عمومی');
    addPhoto(scope, title, asset.collectionTitle, {
      src: asset.fileUrl, preview: asset.thumbnailUrl || asset.fileUrl, title: asset.title,
    }, asset.coverSelectedAt);
  }
  for (const plan of plans) {
    const images = planLandingContent[plan.slug]?.galleryImages ?? [];
    images.forEach((src, index) => addPhoto('plan/' + encodeURIComponent(plan.slug), plan.title, null, {
      src, preview: src, title: plan.title + '، عکس ' + (index + 1).toLocaleString('fa-IR'),
    }));
  }
  return Array.from(collections.values());
}
