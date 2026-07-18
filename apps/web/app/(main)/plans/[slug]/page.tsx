import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPlanContent,
  getPublicNazrTypes,
} from '../../../../lib/public-nazr-types';

type PlanPageProps = {
  params: Promise<{ slug: string }>;
};

async function getPlan(slug: string) {
  const types = await getPublicNazrTypes();
  return types.find((type) => type.slug === slug) ?? null;
}

export async function generateMetadata({ params }: PlanPageProps): Promise<Metadata> {
  const { slug } = await params;
  const plan = await getPlan(slug);

  if (!plan) return { title: 'طرح پیدا نشد | نذر امام' };

  return {
    title: `${plan.title} | نذر امام`,
    description: plan.description,
  };
}

export default async function PlanLandingPage({ params }: PlanPageProps) {
  const { slug } = await params;
  const plan = await getPlan(slug);

  if (!plan) notFound();

  const content = getPlanContent(slug, plan);
  const registrationHref = `/nazr/new?nazrTypeId=${encodeURIComponent(plan.id)}`;

  return (
    <main className={`home-page plan-landing accent-${content.accent}`}>
      <section className="plan-landing-hero">
        <div className="home-container">
          <nav className="plan-breadcrumb" aria-label="مسیر صفحه">
            <Link href="/">خانه</Link>
            <span aria-hidden="true">/</span>
            <Link href="/#plans">طرح‌ها</Link>
            <span aria-hidden="true">/</span>
            <span>{plan.title}</span>
          </nav>

          <div className="plan-hero-layout">
            <div className="plan-hero-content">
              <span className={`plan-status${plan.isActive ? ' is-active' : ' is-complete'}`}>
                {plan.isActive ? 'طرح فعال' : 'طرح تکمیل‌شده'}
              </span>
              <p className="plan-kicker">یکی از مسیرهای نذر امام</p>
              <h1>{plan.title}</h1>
              <p className="plan-tagline">{content.tagline}</p>
              <p className="plan-introduction">{content.introduction}</p>

              <div className="plan-hero-actions">
                {plan.isActive ? (
                  <Link className="home-btn home-btn-primary" href={registrationHref}>
                    مشارکت در این طرح
                  </Link>
                ) : (
                  <span className="home-btn plan-disabled-action">ظرفیت این طرح تکمیل شده است</span>
                )}
                <Link className="home-btn home-btn-secondary" href="#about-plan">
                  درباره طرح
                </Link>
              </div>
            </div>

            <div className="plan-hero-summary" aria-label="خلاصه طرح">
              <span className="plan-summary-mark" aria-hidden="true">
                {plan.title.slice(0, 1)}
              </span>
              <div>
                <span>امکان پیگیری</span>
                <strong>کد رهگیری و گزارش اجرا</strong>
              </div>
              <div>
                <span>روش مشارکت</span>
                <strong>پرداخت آنلاین یا ارسال رسید</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="plan-section" id="about-plan">
        <div className="home-container plan-impact-layout">
          <div className="plan-section-heading">
            <span className="home-eyebrow">اثر این طرح</span>
            <h2>{content.impactTitle}</h2>
            <p>{content.impactDescription}</p>
          </div>

          <div className="plan-highlight-grid">
            {content.highlights.map((highlight, index) => (
              <article className="plan-highlight" key={highlight.title}>
                <span>{new Intl.NumberFormat('fa-IR').format(index + 1)}</span>
                <h3>{highlight.title}</h3>
                <p>{highlight.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="plan-section plan-journey-section">
        <div className="home-container">
          <div className="plan-section-heading plan-section-heading-center">
            <span className="home-eyebrow">مسیر مشارکت</span>
            <h2>از انتخاب تا دیدن نتیجه</h2>
          </div>
          <div className="plan-journey">
            <div>
              <span>۱</span>
              <strong>ثبت مبلغ</strong>
              <p>مبلغ دلخواهت را برای همین طرح ثبت می‌کنی.</p>
            </div>
            <div>
              <span>۲</span>
              <strong>تکمیل پرداخت</strong>
              <p>پرداخت را آنلاین انجام می‌دهی یا رسید را در ایتا می‌فرستی.</p>
            </div>
            <div>
              <span>۳</span>
              <strong>پیگیری اجرا</strong>
              <p>کد رهگیری می‌گیری و ادامه مسیر را در پنل خودت می‌بینی.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="plan-final-cta">
        <div className="home-container plan-final-cta-inner">
          <div>
            <span>همراه این مسیر باش</span>
            <h2>{plan.title}</h2>
            <p>{plan.description}</p>
          </div>
          {plan.isActive ? (
            <Link className="home-btn plan-final-button" href={registrationHref}>
              ثبت نذر برای این طرح
            </Link>
          ) : (
            <Link className="home-btn plan-final-button" href="/#plans">
              مشاهده طرح‌های فعال
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
