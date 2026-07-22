import type { PublicHomeData } from '@nazr-emam/shared';
import { getPublicGalleryAssets } from './public-gallery';
import { getPublicNazrTypes } from './public-nazr-types';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getPublicHomeData(): Promise<PublicHomeData> {
  try {
    const response = await fetch(`${apiUrl}/public/home`, { cache: 'no-store' });
    if (response.ok) return (await response.json()) as PublicHomeData;
  } catch {
    // The homepage keeps a minimal renderable state while the API is unavailable.
  }

  const [plans, introAssets, galleryAssets] = await Promise.all([
    getPublicNazrTypes(),
    getPublicGalleryAssets('intro'),
    getPublicGalleryAssets('gallery'),
  ]);
  const galleryImages = galleryAssets.filter((asset) => asset.type === 'image').slice(0, 4);

  return {
    hero: {
      eyebrow: 'سامانه‌ی شفافِ ثبت و پیگیریِ نذر',
      titleLines: ['نذرِ امام؛', 'مسیرِ روشن برای نیت‌های ماندگار'],
      lead:
        'در نذر امام، درصدی از درآمدت را به مسیرهای فرهنگیِ مشخص می‌سپاری؛ از انتخاب طرح تا پرداخت، کد رهگیری و گزارشِ اجرا، همه‌چیز شفاف و قابل پیگیری است.',
      percentOptions: ['۱٪', '۳٪', '۵٪'],
    },
    whyCards: [],
    stats: [],
    faqs: [],
    plans: plans.map((plan) => ({
      ...plan,
      requestCount: 0,
      paidAmount: { amount: 0, currency: 'IRT' },
      progressPercent: 0,
    })),
    media: {
      introVideo:
        introAssets.find((asset) => asset.type === 'video' && Boolean(asset.fileUrl)) ??
        null,
      galleryVideo:
        galleryAssets.find((asset) => asset.type === 'video' && Boolean(asset.fileUrl)) ??
        null,
      galleryImages,
    },
    activePlans: plans.filter((plan) => plan.isActive).length,
    updatedAt: new Date().toISOString(),
  };
}
