import type { GalleryAsset } from '@nazr-emam/shared';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getPublicGalleryAssets } from '../../lib/public-gallery';
import {
  getPublicNazrTypes,
  planLandingContent,
} from '../../lib/public-nazr-types';

/* ── محتوای واقعی صفحه اصلی (برگرفته از سند طرح نذر امام) ── */

const percents = ['۱٪', '۳٪', '۵٪'];

const heroLead =
  'در نذر امام، درصدی از درآمدت را به مسیرهای فرهنگیِ مشخص می‌سپاری؛ از انتخاب طرح تا پرداخت، کد رهگیری و گزارشِ اجرا، همه‌چیز شفاف و قابل پیگیری است.';

const steps: { title: string; text: string }[] = [
  { title: 'انتخاب طرح', text: 'از میان طرح‌های فعال، مسیری را که به دلت نزدیک‌تر است انتخاب کن.' },
  { title: 'ثبت نذر و مبلغ', text: 'درصدی از درآمدت (۱، ۳ یا ۵٪) یا مبلغ دلخواهت را ثبت کن.' },
  { title: 'پرداخت', text: 'از طریق درگاه یا کارت‌به‌کارت، امن و ساده مشارکت کن.' },
  { title: 'کد رهگیری و گزارش', text: 'کد رهگیری بگیر و اجرای نذرت را در پنل کاربری دنبال کن.' },
];

const whyCards: { title: string; text: string; icon: ReactNode; featured?: boolean }[] = [
  {
    title: 'شفاف و قابل پیگیری',
    text: 'هر نذر کد رهگیری دارد و گزارش اجرای آن در دسترس مشارکت‌کننده قرار می‌گیرد.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'انتخاب مسیر با خودت',
    text: 'پنج طرح مشخص به‌همراه باکس آزاد؛ مبلغ و مقصدِ نذر با انتخاب توست.',
    featured: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'اثری ماندگار و معنوی',
    text: 'مشارکت در باقیات‌الصالحات؛ سرمایه‌گذاری روی ذهن و نسلِ آینده.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 21c-1-6-4-7-4-11a4 4 0 018 0c0 4-3 5-4 11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M12 21v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'پرداخت آسان و منظم',
    text: 'درگاه، کارت‌به‌کارت و کیف پول برای مشارکتِ ماهانه و بدون دردسر.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 10h18M7 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'همراهی و پشتیبانی',
    text: 'تیم پاسخگویی و پیگیری کنارِ توست تا مسیر نذر همیشه روشن بماند.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="3.5" y="12" width="3.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="17" y="12" width="3.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: 'باشگاه مشارکت‌کنندگان',
    text: 'با تداومِ مشارکت، امتیاز و ماموریت‌های ویژه برایت فعال می‌شود.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4l2.2 4.5 5 .7-3.6 3.5.9 5L12 19l-4.4 2.4.9-5L4.8 9.2l5-.7L12 4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const stats = [
  { value: '۹۰٬۰۰۰+', label: 'مخاطب مستقیم' },
  { value: '۷', label: 'کشور فعال' },
  { value: '۳۰۰٬۰۰۰+', label: 'مخاطب غیرمستقیم' },
  { value: '۴۷٬۰۰۰', label: 'جلد کتاب توزیع‌شده' },
  { value: '۳۲', label: 'استان با کارگزار فرهنگی' },
  { value: '۲٬۰۰۰+', label: 'معلمِ همراه' },
];

const faqItems = [
  {
    question: 'نذر امام دقیقاً چیست؟',
    answer:
      'نذر امام یعنی اختصاصِ درصدی از درآمدت (۱، ۳ یا ۵٪) به مسیرهای فرهنگیِ مشخص، به‌نیتِ سربازیِ امام زمان (عج). این مبلغ در طرحی که خودت انتخاب می‌کنی هزینه و گزارش می‌شود.',
  },
  {
    question: 'پولِ من دقیقاً خرجِ چه می‌شود؟',
    answer:
      'هر طرح مسیرِ مصرفِ روشنی دارد؛ از نشرِ کلام امیرالمؤمنین در کشورهای دیگر تا چاپ و گردشِ کتاب میان نوجوانانِ مناطق محروم. گزارشِ اجرای هر طرح در دسترس قرار می‌گیرد.',
  },
  {
    question: 'بعد از پرداخت چطور پیگیری کنم؟',
    answer:
      'پس از پرداختِ موفق، کد رهگیری دریافت می‌کنی و از پنل کاربری، وضعیتِ نذر و ریزِ واریزهایت را می‌بینی.',
  },
  {
    question: 'می‌توانم به‌صورت ماهانه مشارکت کنم؟',
    answer:
      'بله؛ با کیف پول یک‌بار شارژ می‌کنی و مبلغِ نذر هر ماه به‌صورت منظم کسر می‌شود تا نیازی به پرداختِ دستیِ هر ماه نباشد.',
  },
  {
    question: 'اگر هزینه‌ی یک طرح تکمیل شود چه می‌شود؟',
    answer:
      'طرحِ تکمیل‌شده از حالتِ مشارکت خارج (خاموش) می‌شود و طرح‌های فعالِ دیگر برای انتخاب نمایش داده می‌شوند.',
  },
  {
    question: 'اگر نخواهم مسیرِ مشخصی انتخاب کنم؟',
    answer:
      'باکس آزاد دقیقاً برای همین است؛ مبلغ را می‌سپاری و تیم، آن را در اولویت‌دارترین مسیرهای فرهنگی هزینه می‌کند.',
  },
];

function getPlanProgress(index: number): number {
  const progress = [68, 46, 82, 0, 57];
  return progress[index % progress.length];
}

const faNumber = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

function HomeVideo({
  asset,
  className,
  emptyTitle,
  emptyDescription,
}: {
  asset: GalleryAsset | null;
  className: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (!asset?.thumbnailUrl) {
    return (
      <div className={`${className} home-media-empty`}>
        <span className="home-media-empty-icon" aria-hidden="true" />
        <strong>{emptyTitle}</strong>
        <small>{emptyDescription}</small>
      </div>
    );
  }

  return (
    <figure className={`${className} has-media`}>
      <video
        className="home-video-player"
        controls
        playsInline
        poster={asset.thumbnailUrl}
        preload="metadata"
      >
        <source src={asset.fileUrl} />
        مرورگر شما امکان پخش این ویدئو را ندارد.
      </video>
      <figcaption>{asset.title}</figcaption>
    </figure>
  );
}

function GalleryImage({ asset, index }: { asset: GalleryAsset | null; index: number }) {
  if (!asset) {
    return (
      <div className="home-gallery-item is-empty">
        <span>جای تصویر {faNumber(index + 1)}</span>
        <small>تصویر را از مدیریت گالری اضافه کنید.</small>
      </div>
    );
  }

  return (
    <figure className="home-gallery-item">
      <img alt={asset.title} loading="lazy" src={asset.fileUrl} />
      <figcaption>{asset.title}</figcaption>
    </figure>
  );
}

export default async function Home() {
  const [nazrTypes, introAssets, galleryAssets] = await Promise.all([
    getPublicNazrTypes(),
    getPublicGalleryAssets('intro'),
    getPublicGalleryAssets('gallery'),
  ]);
  const activePlans = nazrTypes.filter((t) => t.isActive).length;
  const videos = galleryAssets.filter(
    (asset) => asset.type === 'video' && Boolean(asset.thumbnailUrl),
  );
  const images = galleryAssets.filter((asset) => asset.type === 'image').slice(0, 4);
  const heroVideo = introAssets.find(
    (asset) => asset.type === 'video' && Boolean(asset.thumbnailUrl),
  ) ?? null;
  const galleryVideo = videos[0] ?? null;
  const galleryImageSlots = Array.from(
    { length: 4 },
    (_, index) => images[index] ?? null,
  );

  return (
    <main className="home-page">
      {/* ── قهرمان ── */}
      <section className="home-hero">
        <div className="home-hero-bg" aria-hidden="true" />
        <div className="home-container home-hero-grid">
          <div className="home-hero-content">
            <span className="home-eyebrow">
              <span className="home-eyebrow-dot" aria-hidden="true" />
              سامانه‌ی شفافِ ثبت و پیگیریِ نذر
            </span>
            <h1>
              نذرِ امام؛
              <br />
              مسیرِ روشن برای نیت‌های ماندگار
            </h1>
            <p>{heroLead}</p>

            <div className="home-percent-row" aria-label="درصد پیشنهادی نذر از درآمد">
              <span className="home-percent-label">درصدی از درآمدت را نذر کن:</span>
              <span className="home-percent-chips">
                {percents.map((p) => (
                  <span className="home-percent-chip" key={p}>
                    {p}
                  </span>
                ))}
              </span>
            </div>

            <div className="home-actions">
              <Link className="home-btn home-btn-primary" href="/nazr/new">
                شرکت در نذر
              </Link>
              <Link className="home-btn home-btn-secondary" href="/dashboard">
                پیگیری وضعیت
              </Link>
            </div>

            <p className="home-hero-trust">
              {faNumber(activePlans)} طرحِ فعال · پرداختِ امن · گزارشِ شفافِ اجرا
            </p>
          </div>

          <HomeVideo
            asset={heroVideo}
            className="home-video-card"
            emptyTitle="ویدئوی معرفی نذر امام"
            emptyDescription="کلیپ توضیح کلی ایده از بخش مدیریت رسانه‌ها ثبت می‌شود."
          />
        </div>
      </section>

      {/* ── مسیر راه ── */}
      <section className="home-section home-section-light" id="how">
        <div className="home-container">
          <div className="home-section-heading home-section-heading-center">
            <span className="home-eyebrow">مسیرِ راه</span>
            <h2>از نیت تا گزارش، در چهار گام</h2>
            <p>مشارکت در نذر امام کوتاه و روشن است؛ بدون ابهام و بدون مسیرِ پیچیده.</p>
          </div>
          <div className="home-steps">
            {steps.map((step, i) => (
              <article className="home-step" key={step.title}>
                <span className="home-step-num">{faNumber(i + 1)}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── چرا نذر امام ── */}
      <section className="home-section home-section-warm" id="why">
        <div className="home-container">
          <div className="home-section-heading">
            <span className="home-eyebrow">چرا نذرِ امام؟</span>
            <h2>اعتماد، انتخاب و آرامشِ خاطر در یک مسیر</h2>
            <p>هر مشارکت باید روشن، قابل انتخاب و قابل پیگیری باشد؛ همان چیزی که نذر امام بر آن بنا شده است.</p>
          </div>
          <div className="home-feature-grid">
            {whyCards.map((card) => (
              <article
                className={card.featured ? 'home-feature-card is-featured' : 'home-feature-card'}
                key={card.title}
              >
                <span className="home-feature-icon" aria-hidden="true">
                  {card.icon}
                </span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── آمار اثرگذاری ── */}
      <section className="home-section home-section-deep" id="reports">
        <div className="home-container">
          <div className="home-section-heading home-section-heading-center home-heading-on-deep">
            <span className="home-eyebrow">اثرگذاریِ تا امروز</span>
            <h2>کارهای انجام‌شده، شفاف و قابل اندازه‌گیری</h2>
            <p>نمایی از آنچه با مشارکتِ نیت‌مندان تا امروز رقم خورده است.</p>
          </div>
          <div className="home-stats-grid">
            {stats.map((item) => (
              <div className="home-stat-card" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── بندِ انگیزشی ── */}
      <section className="home-quote" id="reason">
        <div className="home-container home-quote-inner">
          <span className="home-quote-mark" aria-hidden="true">
            ”
          </span>
          <blockquote>قلبِ نوجوان را دریابید، پیش از آنکه دشمن او را برُباید.</blockquote>
          <cite>— امیرالمؤمنین علی (ع)</cite>
          <p>امروز نوجوان را بسازیم تا فردا، آجر به آجرِ آینده‌ی این سرزمین با دستانِ او بنا شود.</p>
        </div>
      </section>

      {/* ── طرح‌ها (کاشی) ── */}
      <section className="home-section home-section-warm" id="plans">
        <div className="home-container">
          <div className="home-section-heading">
            <span className="home-eyebrow">طرح‌ها</span>
            <h2>مسیرِ نذرت را انتخاب کن</h2>
            <p>
              طرح‌ها مستقیماً از سامانه خوانده می‌شوند؛ طرحی که هزینه‌اش تکمیل شود به‌صورت خودکار
              خاموش می‌شود.
            </p>
          </div>

          <div className="home-plan-grid">
            {nazrTypes.map((type, index) => {
              const isActive = type.isActive;
              const progress = getPlanProgress(index);
              const meta = planLandingContent[type.slug];
              const accent = meta?.accent ?? 'green';

              return (
                <Link
                  className={`home-plan-card accent-${accent}${isActive ? '' : ' is-complete'}`}
                  href={`/plans/${encodeURIComponent(type.slug)}`}
                  key={type.id}
                >
                  <div className="home-plan-cover" aria-hidden="true">
                    <span className="home-plan-cover-label">{type.title}</span>
                    <span className="home-plan-badge">{isActive ? 'فعال' : 'تکمیل شد'}</span>
                  </div>
                  <div className="home-plan-body">
                    {meta?.tagline ? <span className="home-plan-tagline">{meta.tagline}</span> : null}
                    <h3>{type.title}</h3>
                    <p>{type.description}</p>
                    {isActive ? (
                      <div
                        className="home-plan-progress"
                        aria-label={`پیشرفت ${faNumber(progress)} درصد`}
                      >
                        <span style={{ width: `${progress}%` }} />
                      </div>
                    ) : null}
                    <div className="home-plan-foot">
                      <span className="home-plan-link">{isActive ? 'مشاهده طرح ←' : 'مشاهده گزارش ←'}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── گالری ── */}
      <section className="home-section home-section-light" id="gallery">
        <div className="home-container home-gallery-grid">
          <div className="home-section-heading home-gallery-heading">
            <span className="home-eyebrow">گالری و ویدئو</span>
            <h2>تا امروز چه کردیم؟</h2>
            <p>روایتِ تصویری از اجرای طرح‌ها؛ تا مسیرِ مشارکت از ثبت تا اجرا برایت لمس‌پذیر باشد.</p>
            <Link className="home-inline-link" href="/profile">
              مشاهده‌ی همه‌ی گزارش‌ها ←
            </Link>
          </div>

          <div className="home-gallery-media-layout">
            <HomeVideo
              asset={galleryVideo}
              className="home-gallery-main"
              emptyTitle="ویدئوی گزارش اجرای طرح‌ها"
              emptyDescription="ویدئوهای اجرای طرح‌ها از بخش گالری مدیریت ثبت می‌شوند."
            />
            <div className="home-gallery-list" aria-label="تصاویر گالری">
              {galleryImageSlots.map((asset, index) => (
                <GalleryImage asset={asset} index={index} key={asset?.id ?? index} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── سوالات متداول ── */}
      <section className="home-section home-section-warm" id="faq">
        <div className="home-container home-faq-layout">
          <div className="home-section-heading">
            <span className="home-eyebrow">سوالات متداول</span>
            <h2>پاسخِ کوتاه به پرسش‌های پرتکرار</h2>
            <p>اگر پاسخِ پرسشت اینجا نبود، از پنل کاربری تیکت بزن؛ تیمِ پاسخگویی همراهت است.</p>
          </div>

          <div className="home-faq-list">
            {faqItems.map((item, i) => (
              <details className="home-faq-item" key={item.question} open={i === 0}>
                <summary>
                  <span>{item.question}</span>
                  <span className="home-faq-icon" aria-hidden="true" />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── فراخوان پایانی ── */}
      <section className="home-cta-band">
        <div className="home-container home-cta-inner">
          <div>
            <h2>همین امروز، نیتت را ماندگار کن</h2>
            <p>انتخابِ طرح، ثبتِ نذر و دریافتِ کد رهگیری؛ در کمتر از چند دقیقه.</p>
          </div>
          <div className="home-actions">
            <Link className="home-btn home-btn-onDeep" href="/nazr/new">
              شرکت در نذر
            </Link>
            <Link className="home-btn home-btn-ghost" href="/dashboard">
              پیگیری وضعیت
            </Link>
          </div>
        </div>
      </section>

      <Link className="home-sticky-cta" href="/nazr/new">
        شرکت در نذر
      </Link>
    </main>
  );
}
