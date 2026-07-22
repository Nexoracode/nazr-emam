import type { GalleryAsset, GalleryAssetPlacement } from '@nazr-emam/shared';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getPublicGalleryAssets(
  placement: GalleryAssetPlacement,
  nazrTypeId?: string,
): Promise<GalleryAsset[]> {
  try {
    const params = new URLSearchParams({ placement });
    if (nazrTypeId) params.set('nazrTypeId', nazrTypeId);
    const response = await fetch(`${apiUrl}/gallery?${params.toString()}`, {
      cache: 'no-store',
    });
    if (!response.ok) return [];
    return (await response.json()) as GalleryAsset[];
  } catch {
    return [];
  }
}
