import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  getPublicNazrTypes,
  planLandingContent,
} from '../../lib/public-nazr-types';

/* ۴ تصویر سکشن گالریِ صفحه اصلی: دو تا از هر طرح. */
const homeGalleryImages = [
  { src: '/plans/nazr-royesh/1.jpg', title: 'نذر رویش' },
  { src: '/plans/nazr-royesh/2.jpg', title: 'نذر رویش' },
  { src: '/plans/niaz-rooz/1.jpg', title: 'نیاز روز' },
  { src: '/plans/niaz-rooz/2.jpg', title: 'نیاز روز' },
];

/* ── محتوای واقعی صفحه اصلی (برگرفته از سند طرح نذر امام) ── */

const heroLead =
  'اینجا عضو یک خانواده‌ی بزرگ هستم که با امام زمانم عهد می‌بندم هر ماه یک درصد مشخص از درآمدم را نذر امام زمان کنم؛ برای آشنایی جهان با امام زمان، برای مسیر ظهور. اینطوری هم قدمی برداشته‌ام برای شناخت بیشتر امام زمان و تعجیل ظهور، و هم برکت مالم زیاد می‌شود.';

const whyCards: { title: string; text: string; icon: ReactNode; featured?: boolean }[] = [
  {
    title: 'سربازِ امام زمان، اقدام می‌کند',
    text: 'فرقِ بین کسی که فقط امام زمان را دوست دارد و کسی که برای امام زمان و ظهور هم کاری می‌کند؛ حالا چه کاری؟ در نذر امام کلی پیشنهاد هست که خودت انتخاب می‌کنی.',
    featured: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'ذهنِ انسان‌ها به‌شدت فقیر است',
    text: 'خیلی‌ها امام زمان را نمی‌شناسند، نمی‌دانند بعد از ظهور چه می‌شود، نمی‌دانند مشکلاتشان با قرآن حل می‌شود و نمی‌دانند نهج‌البلاغه چه دری است؛ برای همین اینجا جمع شده‌ایم.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'کارِ خیر خوب است ماندگار باشد',
    text: 'بهترین سرمایه‌گذاری روی ذهن آدم‌هاست؛ چون با هدایتش تبدیل می‌شود به فردی مثل تو. قرآن: «باقیاتُ الصّالحاتِ خیرٌ عندَ ربّک».',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 21c-1-6-4-7-4-11a4 4 0 018 0c0 4-3 5-4 11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M12 21v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'خدا کارِ جمعی را دوست دارد',
    text: 'کارهای فرهنگی در تمام استان‌ها و کشورهای جهان شاید وزن زیادی داشته باشد، اما با کمک همدیگر به‌راحتی انجامش می‌دهیم. قرآن: «تَعاوَنوا عَلَی البِرِّ و التَّقوی».',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="3.5" y="12" width="3.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="17" y="12" width="3.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: 'روزی و برکتم زیاد می‌شود',
    text: 'اینجا امام زمان شریکِ سود و درآمد من است؛ همین باعث زیاد شدنِ برکت و روزیِ زندگی من می‌شود.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4l2.2 4.5 5 .7-3.6 3.5.9 5L12 19l-4.4 2.4.9-5L4.8 9.2l5-.7L12 4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const stats = [
  { value: '۲۰۰٬۰۰۰+', label: 'جلد کتاب آموزشیِ نهج‌البلاغه' },
  { value: '۱۲۰٬۰۰۰+', label: 'مخاطبِ بین‌الملل' },
  { value: '۹', label: 'کشور فعال' },
  { value: '۳۲', label: 'استان با ۱۳۰ کارگزار فرهنگی' },
  { value: '۲٬۰۰۰+', label: 'معلمِ همراه' },
  { value: '۱٬۳۰۰+', label: 'مسجد در کشور' },
];

const faqItems = [
  {
    question: 'نذر امام دقیقاً چیه؟',
    answer:
      'خیلی از مردم امام زمان را نمی‌شناسند و از ظهور چیزی نمی‌دانند، چه در ایران و چه در کشورهای دیگر. از طرفی ما یک خانواده‌ی بزرگ هستیم که اگر همه به اندازه‌ی توان خود وسط بیاییم، می‌توانیم کارهای فرهنگیِ بزرگی در جهتِ آشنایی بیشتر با امام زمان و زمینه‌سازیِ ظهور، در کنار قرآن و نهج‌البلاغه انجام دهیم. کافی است با امام زمان عهد ببندیم که پای کار او هستیم و هر ماه یک درصدِ مشخص از سود درآمدمان را به این هدفِ مقدس اختصاص دهیم؛ اینطوری در چشم‌اندازِ نزدیک، هزاران نفر با امام زمان بیشتر آشنا می‌شوند و برکت و روزیِ من هم به مناسبتِ شراکتِ امام زمان بیشتر می‌شود.',
  },
  {
    question: 'پولِ من دقیقاً خرجِ چی می‌شه؟',
    answer:
      'هم می‌توانی انتخاب کنی پولت کجا خرج شود؛ ایران یا کشورهای خارجی، نوجوانان یا بزرگسالان، مدارس یا رسانه و... و هم اگر دوست داشتی می‌توانی به اختیارِ ما بگذاری تا هرجا اولویتِ بالاتری در گسترشِ نهج‌البلاغه و قرآن و مهدویت دیدیم هزینه کنیم.',
  },
  {
    question: 'من دقیقاً چیکار می‌تونم بکنم؟',
    answer:
      'اول نیت کن و یکی از طرح‌های پیشنهادی را انتخاب کن، بعد بگو ماهیانه چه درصدی (۱ یا ۳ یا ۵ درصد) از درآمدت را می‌توانی اختصاص بدهی و آن چه روزی از ماه است.',
  },
  {
    question: 'چطور گزارشِ کار می‌دید؟',
    answer:
      'بعد از پرداخت، در پنل کاربری و گالریِ سایت و کانالِ نذر امام، وضعیتِ نذر، گزارشِ روندِ رشدِ طرحِ انتخاب‌شده و گزارشِ کارهای نهاییِ انجام‌شده را می‌توانید ببینید.',
  },
  {
    question: 'اگر هزینه‌ی یک طرح تکمیل بشه چی می‌شه؟',
    answer:
      'طرحِ تکمیل‌شده از حالتِ مشارکت خارج می‌شود و طرح‌های فعالِ دیگر برای انتخاب نمایش داده می‌شوند.',
  },
  {
    question: 'اگر نخوام مسیرِ مشخصی انتخاب کنم چی؟',
    answer:
      'طرحِ «نیاز روز» دقیقاً برای همین است؛ مبلغ را می‌سپاری و تیم، آن را در اولویت‌دارترین مسیرهای فرهنگی هزینه می‌کند.',
  },
];

function getPlanProgress(index: number): number {
  const progress = [68, 46, 82, 0, 57];
  return progress[index % progress.length];
}

function planVisualClass(slug: string): string {
  return `visual-${slug.replace(/[^a-z0-9-]/gi, '') || 'default'}`;
}

const faNumber = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

export default async function Home() {
  const nazrTypes = await getPublicNazrTypes();
  const activePlans = nazrTypes.filter((t) => t.isActive).length;

  return (
    <main className="home-page">
      {/* ── قهرمان ── */}
      <section className="home-hero">
        <div className="home-hero-bg" aria-hidden="true" />
        <div className="home-container home-hero-grid">
          <div className="home-hero-content">
            <span className="home-bismillah">بسم الله الرحمن الرحیم</span>
            <span className="home-eyebrow">
              <span className="home-eyebrow-dot" aria-hidden="true" />
              سامانه‌ی شفافِ ثبت و پیگیریِ نذر
            </span>
            <h1>
              درصدی از درآمدم،
              <br />
              نذرِ امام زمان
            </h1>
            <p>{heroLead}</p>

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

          <div className="home-video-card home-video-embed" aria-label="ویدئوی معرفی نذر امام">
            <iframe
              src="https://www.aparat.com/video/video/embed/videohash/zpd0432/vt/frame"
              title="ویدئوی معرفی نذر امام"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
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

      {/* ── گالری ── */}
      <section className="home-section home-section-light" id="gallery">
        <div className="home-container home-gallery-grid">
          <div className="home-section-heading home-gallery-heading">
            <span className="home-eyebrow">گالری</span>
            <h2>تا امروز چه کردیم؟</h2>
            <p>روایتِ تصویری از اجرای طرح‌ها؛ تا مسیرِ مشارکت از ثبت تا اجرا برایت لمس‌پذیر باشد.</p>
            <Link className="home-inline-link" href="/profile">
              مشاهده‌ی همه‌ی گزارش‌ها ←
            </Link>
          </div>

          <div className="home-gallery-list" aria-label="تصاویر گالری">
            {homeGalleryImages.map((img) => (
              <figure className="home-gallery-item" key={img.src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={img.title} loading="lazy" />
                <figcaption>{img.title}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── طرح‌ها (کاشی) ── */}
      <section className="home-section home-section-warm" id="plans">
        <div className="home-container">
          <div className="home-section-heading">
            <span className="home-eyebrow">طرح‌ها</span>
            <h2>مسیرِ نذرت را انتخاب کن</h2>
          </div>

          <div className="home-plan-grid">
            {nazrTypes.map((type, index) => {
              const isActive = type.isActive;
              const progress = getPlanProgress(index);
              const meta = planLandingContent[type.slug];
              const accent = meta?.accent ?? 'green';

              return (
                <Link
                  aria-disabled={!isActive}
                  className={`home-plan-card accent-${accent}${isActive ? '' : ' is-complete'}`}
                  href={`/plans/${encodeURIComponent(type.slug)}`}
                  key={type.id}
                >
                  <div
                    className={`home-plan-cover ${planVisualClass(type.slug)}${meta?.coverImage ? ' has-cover' : ''}`}
                    aria-hidden="true"
                  >
                    {meta?.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="home-plan-cover-img" src={meta.coverImage} alt="" loading="lazy" />
                    ) : (
                      <span className="home-plan-illustration" />
                    )}
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
            <h2>نیت کن، با خود امام زمان عهد ببند</h2>
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
