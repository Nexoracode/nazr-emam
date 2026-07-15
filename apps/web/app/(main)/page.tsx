import Link from 'next/link';

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
    text: 'طرح‌های فعال، مبلغ مورد نیاز و وضعیت تکمیل هر طرح در یک نگاه دیده می‌شود.',
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

const plans = [
  { title: 'اطعام زائران', amount: '۳۲۰,۰۰۰ تومان', progress: 68, status: 'فعال' },
  { title: 'بسته معیشتی', amount: '۷۵۰,۰۰۰ تومان', progress: 46, status: 'فعال' },
  { title: 'چراغ حرم دل‌ها', amount: '۱۸۰,۰۰۰ تومان', progress: 100, status: 'تکمیل‌شده' },
  { title: 'نذر درمان', amount: '۱,۲۰۰,۰۰۰ تومان', progress: 38, status: 'فعال' },
  { title: 'نذر فرهنگی', amount: '۲۵۰,۰۰۰ تومان', progress: 57, status: 'فعال' },
  { title: 'خدمت داوطلبانه', amount: 'ثبت مشارکت', progress: 82, status: 'فعال' },
];

export default function Home() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-container home-hero-grid">
          <div className="home-hero-content">
            <span className="home-eyebrow">سامانه شفاف ثبت و پیگیری نذر</span>
            <h1>نذر امام؛ مسیر روشن برای نیت‌های ماندگار</h1>
            <p>
              در نذر امام، هر نذر از انتخاب طرح تا ثبت پرداخت، دریافت کد رهگیری و مشاهده گزارش اجرا،
              ساده و قابل اعتماد پیش می‌رود.
            </p>
            <div className="home-actions">
              <Link className="home-btn home-btn-primary" href="/nazr/new">
                شرکت در نذر
              </Link>
              <Link className="home-btn home-btn-secondary" href="/track">
                پیگیری وضعیت
              </Link>
            </div>
          </div>

          <div className="home-video-card" aria-label="ویدئوی معرفی نذر امام">
            <div className="home-play-button" aria-hidden="true">
              <span />
            </div>
            <p>ویدئوی کوتاه از مسیر ثبت، اجرا و گزارش نذرها</p>
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
              کاشی‌های زیر برای انتخاب سریع طرح طراحی شده‌اند. طرح‌های تکمیل‌شده در حالت خاموش قرار
              می‌گیرند تا وضعیت آن‌ها در یک نگاه مشخص باشد.
            </p>
          </div>

          <div className="home-plan-grid">
            {plans.map((plan) => {
              const isComplete = plan.status === 'تکمیل‌شده';

              return (
                <article className={isComplete ? 'home-plan-card is-complete' : 'home-plan-card'} key={plan.title}>
                  <div className="home-plan-head">
                    <h3>{plan.title}</h3>
                    <span>{plan.status}</span>
                  </div>
                  <p>{plan.amount}</p>
                  <div className="home-plan-progress" aria-label={`پیشرفت ${plan.progress} درصد`}>
                    <span style={{ width: `${plan.progress}%` }} />
                  </div>
                  <Link className="home-plan-link" href={isComplete ? '/#plans' : '/nazr/new'}>
                    {isComplete ? 'تکمیل شده' : 'شرکت در طرح'}
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
