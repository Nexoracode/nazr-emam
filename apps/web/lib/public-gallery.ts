import type { GalleryAsset } from '@nazr-emam/shared';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getPublicGalleryAssets(): Promise<GalleryAsset[]> {
  try {
    const response = await fetch(`${apiUrl}/gallery`, { cache: 'no-store' });
    if (!response.ok) return [];
    return (await response.json()) as GalleryAsset[];
  } catch {
    return [];
  }
}
