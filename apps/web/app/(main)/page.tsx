import type { GalleryAsset, PublicHomeWhyIcon } from '@nazr-emam/shared';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getPublicHomeData } from '../../lib/public-home';
import { planLandingContent } from '../../lib/public-nazr-types';

/* ── محتوای واقعی صفحه اصلی (برگرفته از سند طرح نذر امام) ── */

const whyIcons: Record<PublicHomeWhyIcon, ReactNode> = {
  shield: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
  ),
  compass: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
  ),
  legacy: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 21c-1-6-4-7-4-11a4 4 0 018 0c0 4-3 5-4 11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M12 21v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
  ),
  wallet: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 10h18M7 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
  ),
  support: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="3.5" y="12" width="3.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="17" y="12" width="3.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
  ),
  club: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4l2.2 4.5 5 .7-3.6 3.5.9 5L12 19l-4.4 2.4.9-5L4.8 9.2l5-.7L12 4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
  ),
};

function planVisualClass(slug: string): string {
  return `visual-${slug.replace(/[^a-z0-9-]/gi, '') || 'default'}`;
}

const faNumber = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

const VIDEO_MIME_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

function videoMimeType(url: string): string | undefined {
  const ext = url.split(/[?#]/)[0].split('.').pop()?.toLowerCase();
  return ext ? VIDEO_MIME_BY_EXT[ext] : undefined;
}

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
  // پخش‌پذیری به fileUrl وابسته است نه به تصویر بندانگشتی؛ ویدئوی بدون poster هم باید پخش شود.
  if (!asset?.fileUrl) {
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
        poster={asset.thumbnailUrl ?? undefined}
        preload="metadata"
      >
        <source src={asset.fileUrl} type={videoMimeType(asset.fileUrl)} />
        مرورگر شما امکان پخش این ویدئو را ندارد.
      </video>
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
  const homeData = await getPublicHomeData();
  const { hero, plans, whyCards, stats, faqs, media, activePlans } = homeData;
  const galleryImageSlots = Array.from(
    { length: 4 },
    (_, index) => media.galleryImages[index] ?? null,
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
              {hero.eyebrow}
            </span>
            <h1>
              {hero.titleLines.map((line, index) => (
                <span key={line}>
                  {line}
                  {index < hero.titleLines.length - 1 ? <br /> : null}
                </span>
              ))}
            </h1>
            <p>{hero.lead}</p>

            <div className="home-percent-row" aria-label="درصد پیشنهادی نذر از درآمد">
              <span className="home-percent-label">درصدی از درآمدت را نذر کن:</span>
              <span className="home-percent-chips">
                {hero.percentOptions.map((p) => (
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
            asset={media.introVideo}
            className="home-video-card"
            emptyTitle="ویدئوی معرفی نذر امام"
            emptyDescription="کلیپ توضیح کلی ایده از بخش مدیریت رسانه‌ها ثبت می‌شود."
          />
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
                  {whyIcons[card.icon]}
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
              asset={media.galleryVideo}
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

      {/* ── طرح‌ها (کاشی) ── */}
      <section className="home-section home-section-warm" id="plans">
        <div className="home-container">
          <div className="home-section-heading">
            <span className="home-eyebrow">طرح‌ها</span>
            <h2>مسیرِ نذرت را انتخاب کن</h2>
            <p>
              طرح‌ها مستقیماً از سامانه خوانده می‌شوند؛ طرحی که هزینه‌اش تکمیل شود به حالت
              خاموش نمایش داده می‌شود.
            </p>
          </div>

          <div className="home-plan-grid">
            {plans.map((type) => {
              const isActive = type.isActive;
              const progress = type.progressPercent;
              const meta = planLandingContent[type.slug];
              const accent = meta?.accent ?? 'green';

              return (
                <Link
                  aria-disabled={!isActive}
                  className={`home-plan-card accent-${accent}${isActive ? '' : ' is-complete'}`}
                  href={`/plans/${encodeURIComponent(type.slug)}`}
                  key={type.id}
                >
                  <div className={`home-plan-cover ${planVisualClass(type.slug)}`} aria-hidden="true">
                    <span className="home-plan-illustration" />
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

      {/* ── سوالات متداول ── */}
      <section className="home-section home-section-warm" id="faq">
        <div className="home-container home-faq-layout">
          <div className="home-section-heading">
            <span className="home-eyebrow">سوالات متداول</span>
            <h2>پاسخِ کوتاه به پرسش‌های پرتکرار</h2>
            <p>اگر پاسخِ پرسشت اینجا نبود، از پنل کاربری تیکت بزن؛ تیمِ پاسخگویی همراهت است.</p>
          </div>

          <div className="home-faq-list">
            {faqs.map((item, i) => (
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
