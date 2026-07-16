import type { NazrType, ProjectInfo } from '@nazr-emam/shared';
import Link from 'next/link';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const stats = [
  { value: '۱۲۸۰+', label: 'نذر ثبت‌شده' },
  { value: '۳۴', label: 'طرح تکمیل‌شده' },
  { value: '۹۶۰+', label: 'خانواده بهره‌مند' },
  { value: '۹۸٪', label: 'رضایت مشارکت‌کنندگان' },
];

const whyCards = [
  {
    title: 'شفاف و قابل پیگیری',
    text: 'بعد از ثبت و پرداخت، وضعیت نذر با کد رهگیری قابل مشاهده است.',
  },
  {
    title: 'انتخاب طرح مناسب',
    text: 'طرح‌های فعال، مبلغ پیشنهادی و مسیر مشارکت هر طرح در یک نگاه دیده می‌شود.',
    featured: true,
  },
  {
    title: 'اثر معنوی و اجتماعی',
    text: 'هر مشارکت در مسیر مشخص ثبت می‌شود و گزارش اجرای آن در دسترس قرار می‌گیرد.',
  },
];

const faqItems = [
  {
    question: 'هدف شما از انتخاب این طرح‌ها چیست؟',
    answer: 'طرح‌ها بر اساس نیازهای واقعی، امکان گزارش‌دهی و اثرگذاری روشن انتخاب می‌شوند.',
  },
  {
    question: 'بعد از پرداخت چطور پیگیری کنم؟',
    answer: 'پس از پرداخت موفق، کد رهگیری دریافت می‌کنید و از بخش پیگیری یا پنل کاربری وضعیت را می‌بینید.',
  },
  {
    question: 'اگر هزینه یک طرح کامل شد چه می‌شود؟',
    answer: 'طرح تکمیل‌شده از حالت مشارکت خارج می‌شود و طرح‌های فعال دیگر نمایش داده می‌شوند.',
  },
];

const fallbackProject: ProjectInfo = {
  name: 'Nazr Emam',
  description: 'سامانه ثبت، پرداخت و پیگیری نذر امام',
  workflow: ['انتخاب طرح', 'ثبت نذر', 'پرداخت', 'دریافت کد رهگیری'],
};

const fallbackNazrTypes: NazrType[] = [
  {
    id: 'fallback-food',
    slug: 'food',
    title: 'اطعام زائران',
    description: 'مشارکت در تامین اطعام و پذیرایی از زائران و خانواده‌های نیازمند.',
    suggestedAmount: { amount: 320000, currency: 'IRT' },
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'fallback-livelihood',
    slug: 'livelihood',
    title: 'بسته معیشتی',
    description: 'کمک به تهیه بسته‌های معیشتی برای خانواده‌های کم‌برخوردار.',
    suggestedAmount: { amount: 750000, currency: 'IRT' },
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'fallback-culture',
    slug: 'culture',
    title: 'نذر فرهنگی',
    description: 'حمایت از تولید و توزیع محتوای فرهنگی و آموزشی.',
    suggestedAmount: { amount: 250000, currency: 'IRT' },
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
];

async function fetchPublicApi<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function formatMoney(type: NazrType): string {
  if (!type.suggestedAmount) {
    return 'مبلغ آزاد';
  }

  const amount = new Intl.NumberFormat('fa-IR').format(type.suggestedAmount.amount);
  const unit = type.suggestedAmount.currency === 'IRT' ? 'تومان' : 'ریال';
  return `${amount} ${unit}`;
}

function getPlanProgress(index: number): number {
  const progress = [68, 46, 82, 57, 38, 74];
  return progress[index % progress.length];
}

export default async function Home() {
  const [project, nazrTypesResponse] = await Promise.all([
    fetchPublicApi<ProjectInfo>('/project'),
    fetchPublicApi<NazrType[]>('/nazr-types'),
  ]);

  const projectInfo = project ?? fallbackProject;
  const nazrTypes =
    nazrTypesResponse && nazrTypesResponse.length > 0 ? nazrTypesResponse : fallbackNazrTypes;

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-container home-hero-grid">
          <div className="home-hero-content">
            <span className="home-eyebrow">سامانه شفاف ثبت و پیگیری نذر</span>
            <h1>نذر امام؛ مسیر روشن برای نیت‌های ماندگار</h1>
            <p>
              {projectInfo.description ||
                'در نذر امام، هر نذر از انتخاب طرح تا ثبت پرداخت، دریافت کد رهگیری و مشاهده گزارش اجرا، ساده و قابل اعتماد پیش می‌رود.'}
            </p>
            <div className="home-actions">
              <Link className="home-btn home-btn-primary" href="/nazr/new">
                شرکت در نذر
              </Link>
              <Link className="home-btn home-btn-secondary" href="/dashboard">
                پیگیری وضعیت
              </Link>
            </div>
          </div>

          <div className="home-video-card" aria-label="ویدئوی معرفی نذر امام">
            <div className="home-play-button" aria-hidden="true">
              <span />
            </div>
            <p>{projectInfo.workflow.join('، ')}</p>
          </div>
        </div>
      </section>

      <section className="home-section home-section-light" id="why">
        <div className="home-container">
          <div className="home-section-heading">
            <span className="home-eyebrow">چرا نذر امام؟</span>
            <h2>اعتماد، پیگیری و آرامش خاطر در یک مسیر ساده</h2>
            <p>ثبت نذر باید کوتاه، روشن و قابل پیگیری باشد؛ بدون ابهام برای مشارکت‌کننده.</p>
          </div>

          <div className="home-feature-grid">
            {whyCards.map((card) => (
              <article className={card.featured ? 'home-feature-card is-featured' : 'home-feature-card'} key={card.title}>
                <span className="home-feature-icon" aria-hidden="true" />
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section-warm" id="reports">
        <div className="home-container">
          <div className="home-section-heading">
            <span className="home-eyebrow">گزارش‌ها</span>
            <h2>کارهای انجام‌شده، شفاف و خلاصه</h2>
            <p>نمای کلی مشارکت‌ها و طرح‌های اجراشده برای اینکه اثر نذرها قابل دیدن باشد.</p>
          </div>

          <div className="home-stats-grid">
            {stats.map((item) => (
              <div className="home-stat-card" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <Link className="home-inline-link" href="/profile">
            مشاهده گزارش‌ها
          </Link>
        </div>
      </section>

      <section className="home-section home-section-light" id="gallery">
        <div className="home-container home-gallery-grid">
          <div className="home-section-heading home-gallery-heading">
            <span className="home-eyebrow">گالری و ویدئو</span>
            <h2>روایت تصویری از اجرای نذرها</h2>
            <p>گزارش‌های تصویری کمک می‌کند مسیر مشارکت از ثبت تا اجرا برای کاربر قابل لمس باشد.</p>
          </div>

          <div className="home-gallery-main">
            <span>گزارش تصویری اجرای طرح</span>
          </div>
          <div className="home-gallery-list" aria-label="نمونه تصاویر گالری">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="home-section home-section-warm" id="faq">
        <div className="home-container home-faq-layout">
          <div className="home-section-heading">
            <span className="home-eyebrow">سوالات</span>
            <h2>پاسخ کوتاه به سوال‌های پرتکرار</h2>
          </div>

          <div className="home-faq-list">
            {faqItems.map((item) => (
              <article className="home-faq-item" key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section-light" id="plans">
        <div className="home-container">
          <div className="home-section-heading">
            <span className="home-eyebrow">طرح‌ها</span>
            <h2>طرح‌های نذر</h2>
            <p>
              این بخش مستقیماً از API نوع‌های نذر خوانده می‌شود تا هر طرحی که در بک‌اند فعال است، در
              صفحه اصلی هم دیده شود.
            </p>
          </div>

          <div className="home-plan-grid">
            {nazrTypes.map((type, index) => {
              const isActive = type.isActive;
              const progress = getPlanProgress(index);

              return (
                <article className={isActive ? 'home-plan-card' : 'home-plan-card is-complete'} key={type.id}>
                  <div className="home-plan-head">
                    <h3>{type.title}</h3>
                    <span>{isActive ? 'فعال' : 'غیرفعال'}</span>
                  </div>
                  <p>{type.description}</p>
                  <strong className="home-plan-amount">{formatMoney(type)}</strong>
                  <div className="home-plan-progress" aria-label={`پیشرفت ${progress} درصد`}>
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <Link className="home-plan-link" href={isActive ? '/nazr/new' : '/#plans'}>
                    {isActive ? 'شرکت در طرح' : 'فعلاً غیرفعال'}
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <Link className="home-sticky-cta" href="/nazr/new">
        شرکت در نذر
      </Link>
    </main>
  );
}
