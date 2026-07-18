import type { GalleryAsset, GalleryAssetPlacement } from '@nazr-emam/shared';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getPublicGalleryAssets(
  placement: GalleryAssetPlacement,
): Promise<GalleryAsset[]> {
  try {
    const response = await fetch(`${apiUrl}/gallery?placement=${placement}`, {
      cache: 'no-store',
    });
    if (!response.ok) return [];
    return (await response.json()) as GalleryAsset[];
  } catch {
    return [];
  }
}
