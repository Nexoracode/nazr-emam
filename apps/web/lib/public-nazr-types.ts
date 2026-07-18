import type { NazrType } from '@nazr-emam/shared';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type PlanAccent = 'green' | 'gold' | 'teal' | 'plum' | 'sand';

export interface PlanLandingContent {
  accent: PlanAccent;
  tagline: string;
  introduction: string;
  impactTitle: string;
  impactDescription: string;
  highlights: Array<{
    title: string;
    description: string;
  }>;
}

export const planLandingContent: Record<string, PlanLandingContent> = {
  international: {
    accent: 'green',
    tagline: 'بیداری امت‌ها با کلام امیرالمؤمنین (ع)',
    introduction:
      'این طرح، مسیر رساندن معارف قرآن و نهج‌البلاغه به مخاطبان کشورهای دیگر را هموار می‌کند؛ از آماده‌سازی محتوای مناسب تا انتشار هدفمند آن.',
    impactTitle: 'یک پیام روشن، فراتر از مرزها',
    impactDescription:
      'مشارکت‌ها برای تولید، آماده‌سازی و رساندن محتوای فرهنگی به مخاطبانی هزینه می‌شود که دسترسی کمتری به منابع معتبر فارسی و بومی دارند.',
    highlights: [
      { title: 'محتوای قابل اعتماد', description: 'آماده‌سازی محتوای قرآنی و نهج‌البلاغه با روایت روشن و قابل فهم.' },
      { title: 'انتشار هدفمند', description: 'رساندن محتوا به مخاطبان و فعالان فرهنگی در کشورهای مختلف.' },
      { title: 'گزارش مسیر اجرا', description: 'ثبت روند اجرای طرح و نمایش گزارش‌ها در پنل مشارکت‌کنندگان.' },
    ],
  },
  'circulating-waqf': {
    accent: 'gold',
    tagline: 'روشن‌کردن چرخه بی‌نهایت اثرگذاری در ذهن‌ها',
    introduction:
      'در وقف در گردش، یک کتاب پس از خوانده‌شدن متوقف نمی‌ماند؛ میان نوجوانان و فعالان فرهنگی دست‌به‌دست می‌شود و فرصت یادگیری تازه‌ای می‌سازد.',
    impactTitle: 'یک کتاب، چندین مخاطب',
    impactDescription:
      'هزینه‌ها صرف تهیه و توزیع کتاب و محتوای آموزشی در مناطق کم‌برخوردار می‌شود تا هر نسخه، بارها خوانده و به نفر بعد سپرده شود.',
    highlights: [
      { title: 'تهیه منابع', description: 'چاپ و آماده‌سازی کتاب‌ها و محتوای آموزشی متناسب با نوجوانان.' },
      { title: 'گردش واقعی', description: 'رساندن منابع به حلقه‌های فرهنگی و ایجاد چرخه دست‌به‌دست‌شدن کتاب.' },
      { title: 'اثر ماندگار', description: 'تبدیل هر مشارکت به فرصتی که برای چند مخاطب ادامه پیدا می‌کند.' },
    ],
  },
  'nahj-lesson': {
    accent: 'teal',
    tagline: 'درس‌نامه نهج‌البلاغه برای نسل نوجوان',
    introduction:
      'این طرح از تولید و توزیع درس‌نامه‌هایی حمایت می‌کند که مفاهیم نهج‌البلاغه را برای نوجوانان و معلمان، ساده و قابل استفاده می‌سازند.',
    impactTitle: 'یادگیری عمیق با زبان نوجوان',
    impactDescription:
      'مشارکت‌ها به تولید محتوای آموزشی، آماده‌سازی درس‌نامه و رساندن آن به معلمان و محافل نوجوانان اختصاص پیدا می‌کند.',
    highlights: [
      { title: 'بیان قابل فهم', description: 'تبدیل مفاهیم عمیق نهج‌البلاغه به درس‌های روشن و کاربردی.' },
      { title: 'همراهی معلمان', description: 'فراهم‌کردن ابزار آموزشی برای معلمان و مربیان فعال.' },
      { title: 'توزیع هدفمند', description: 'رساندن درس‌نامه‌ها به مدارس، محافل و گروه‌های نوجوانان.' },
    ],
  },
  'free-box': {
    accent: 'sand',
    tagline: 'مبلغ را تو انتخاب کن؛ اولویت را نیاز روز مشخص می‌کند',
    introduction:
      'باکس آزاد برای زمانی است که می‌خواهی در نذر امام همراه باشی اما ترجیح می‌دهی مبلغت در ضروری‌ترین نیازهای جاری هزینه شود.',
    impactTitle: 'پشتیبانی از اولویت‌های فوری',
    impactDescription:
      'تیم اجرایی مبلغ این طرح را با توجه به نیازهای واقعی و فوری، میان مسیرهای فرهنگی فعال تخصیص می‌دهد و نتیجه آن را گزارش می‌کند.',
    highlights: [
      { title: 'انتخاب مبلغ آزاد', description: 'بدون مبلغ پیشنهادی ثابت و متناسب با توان و نیت خودت مشارکت می‌کنی.' },
      { title: 'تخصیص بر اساس نیاز', description: 'مبلغ در اولویت‌دارترین بخش‌های فعال نذر امام هزینه می‌شود.' },
      { title: 'شفافیت اجرا', description: 'وضعیت نذر و گزارش فعالیت‌ها از پنل کاربری قابل پیگیری است.' },
    ],
  },
  'support-team': {
    accent: 'plum',
    tagline: 'پاسخگویی و پیگیری نذرها، کنار مخاطب',
    introduction:
      'این طرح از تیمی حمایت می‌کند که ارتباط با مخاطبان، پاسخ به پرسش‌ها و پیگیری مسیر نذرها را یکپارچه و منظم انجام می‌دهد.',
    impactTitle: 'هیچ پرسشی بی‌پاسخ نمی‌ماند',
    impactDescription:
      'مشارکت‌ها برای حفظ و تقویت فرآیند پاسخگویی، ارتباط با مخاطبان و پیگیری فعالیت‌های فرهنگی هزینه می‌شود.',
    highlights: [
      { title: 'پاسخگویی متمرکز', description: 'پاسخ به پرسش‌های مخاطبان از مسیرهای ارتباطی یکپارچه.' },
      { title: 'پیگیری منظم', description: 'دنبال‌کردن وضعیت مشارکت‌ها و همراهی با مخاطبان در ادامه مسیر.' },
      { title: 'ارتباط انسانی', description: 'ساخت تجربه‌ای روشن و قابل اعتماد برای هر مشارکت‌کننده.' },
    ],
  },
};

export const fallbackNazrTypes: NazrType[] = [
  {
    id: 'fallback-international',
    slug: 'international',
    title: 'بین‌الملل',
    description: 'مشارکت در نشر کلام امیرالمؤمنین و نهج‌البلاغه برای مخاطبان کشورهای دیگر.',
    suggestedAmount: { amount: 500000, currency: 'IRT' },
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'fallback-waqf',
    slug: 'circulating-waqf',
    title: 'وقف در گردش',
    description: 'چاپ و گردش کتاب‌های نهج‌البلاغه میان نوجوانان مناطق محروم.',
    suggestedAmount: { amount: 300000, currency: 'IRT' },
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'fallback-nahj',
    slug: 'nahj-lesson',
    title: 'درس‌نامه نهج‌البلاغه نوجوان',
    description: 'تولید درس‌نامه نهج‌البلاغه برای تدریس در محافل و مدارس.',
    suggestedAmount: { amount: 250000, currency: 'IRT' },
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'fallback-freebox',
    slug: 'free-box',
    title: 'باکس آزاد',
    description: 'مبلغ و مسیر نذر با انتخاب توست؛ تیم آن را در اولویت‌ها هزینه می‌کند.',
    suggestedAmount: null,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'fallback-support',
    slug: 'support-team',
    title: 'تیم پاسخگویی',
    description: 'حمایت از تیم پاسخگویی و پیگیری نذرها و ارتباط با مخاطبان.',
    suggestedAmount: { amount: 200000, currency: 'IRT' },
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
];

export async function getPublicNazrTypes(): Promise<NazrType[]> {
  try {
    const response = await fetch(`${apiUrl}/nazr-types`, { cache: 'no-store' });
    if (response.ok) {
      const types = (await response.json()) as NazrType[];
      if (types.length > 0) return types;
    }
  } catch {
    // The public pages remain available while the API is temporarily unavailable.
  }

  return fallbackNazrTypes;
}

export function getPlanContent(slug: string, type: NazrType): PlanLandingContent {
  return (
    planLandingContent[slug] ?? {
      accent: 'green',
      tagline: type.title,
      introduction: type.description,
      impactTitle: 'همراهی شفاف و قابل پیگیری',
      impactDescription:
        'مشارکت شما در مسیر تعریف‌شده این طرح هزینه می‌شود و وضعیت آن از پنل کاربری قابل پیگیری خواهد بود.',
      highlights: [
        { title: 'هدف مشخص', description: type.description },
        { title: 'پرداخت امن', description: 'مشارکت از طریق درگاه پرداخت و با ثبت کامل جزئیات انجام می‌شود.' },
        { title: 'پیگیری نتیجه', description: 'بعد از پرداخت، کد رهگیری و گزارش وضعیت در اختیار شما قرار می‌گیرد.' },
      ],
    }
  );
}

export function formatNazrTypeAmount(type: NazrType): string {
  if (!type.suggestedAmount) return 'مبلغ آزاد';

  const amount = new Intl.NumberFormat('fa-IR').format(type.suggestedAmount.amount);
  const unit = type.suggestedAmount.currency === 'IRT' ? 'تومان' : 'ریال';
  return `${amount} ${unit}`;
}
