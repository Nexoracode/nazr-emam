'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type {
  GalleryAsset,
  InvitationCard,
  NazrRequest,
  NazrRequestStatus,
  NotificationItem,
  Paginated,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Ticket,
  UserMissionStatus,
  UserPlatform,
  UserProfileDetails,
  UserProfileSummary,
  Wallet,
  WalletTransaction,
} from '@nazr-emam/shared';
import {
  ApiRequestError,
  changePassword,
  closeTicket,
  createInvitationCard,
  createTicket,
  createWalletCharge,
  getInvitationCards,
  getMyNazrRequests,
  getMyTickets,
  getNotifications,
  getProfileDetails,
  getProfileGallery,
  getProfilePayments,
  getProfileSummary,
  getProfileWallet,
  getWalletTransactions,
  markNotificationAsRead,
  replyTicket,
  startOnlineNazrPayment,
  updateProfileDetails,
  updateProfileGoal,
  updateProfileWallet,
} from '../../lib/api';
import {
  amountToPersianWords,
  formatAmountInput,
  parseAmountInput,
} from '../../lib/amount';

type ProfileTab =
  | 'dashboard'
  | 'account'
  | 'contributions'
  | 'payments'
  | 'tickets'
  | 'notifications'
  | 'wallet'
  | 'club'
  | 'gallery'
  | 'invite';

const TAB_GROUPS: Array<{ label: string; tabs: Array<{ id: ProfileTab; label: string }> }> = [
  {
    label: 'فعالیت‌های من',
    tabs: [
      { id: 'dashboard', label: 'داشبورد' },
      { id: 'contributions', label: 'مشارکت‌ها' },
      { id: 'payments', label: 'واریزها' },
      { id: 'wallet', label: 'کیف پول' },
      { id: 'club', label: 'باشگاه' },
    ],
  },
  {
    label: 'ارتباطات',
    tabs: [
      { id: 'tickets', label: 'تیکت‌ها' },
      { id: 'notifications', label: 'اعلان‌ها' },
    ],
  },
  {
    label: 'حساب و محتوا',
    tabs: [
      { id: 'account', label: 'اطلاعات حساب' },
      { id: 'gallery', label: 'گالری' },
      { id: 'invite', label: 'دعوت دوستان' },
    ],
  },
];

const TABS = TAB_GROUPS.flatMap((group) => group.tabs);

const PLATFORM_OPTIONS: Array<{ id: UserPlatform; label: string }> = [
  { id: 'eitaa', label: 'ایتا' },
  { id: 'instagram', label: 'اینستاگرام' },
  { id: 'telegram', label: 'تلگرام' },
  { id: 'whatsapp', label: 'واتساپ' },
  { id: 'website', label: 'وب‌سایت' },
  { id: 'other', label: 'سایر' },
];

const TICKET_STATUS_LABEL: Record<Ticket['status'], string> = {
  open: 'در انتظار پاسخ',
  answered: 'پاسخ داده شده',
  closed: 'بسته شده',
};

const TICKET_STATUS_CLASS: Record<Ticket['status'], string> = {
  open: 'badge-warning',
  answered: 'badge-success',
  closed: 'badge-neutral',
};

const STATUS_LABEL: Record<NazrRequestStatus, string> = {
  draft: 'پیش‌نویس',
  submitted: 'ثبت شده',
  awaiting_payment: 'منتظر پرداخت',
  payment_pending_review: 'در حال بررسی پرداخت',
  confirmed: 'تایید شده',
  in_progress: 'در حال انجام',
  completed: 'انجام شده',
  cancelled: 'لغو شده',
  rejected: 'رد شده',
};

const STATUS_COLOR: Record<NazrRequestStatus, string> = {
  draft: 'badge-neutral',
  submitted: 'badge-info',
  awaiting_payment: 'badge-warning',
  payment_pending_review: 'badge-warning',
  confirmed: 'badge-success',
  in_progress: 'badge-info',
  completed: 'badge-success',
  cancelled: 'badge-neutral',
  rejected: 'badge-danger',
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'در انتظار بررسی',
  paid: 'پرداخت موفق',
  rejected: 'رد شده',
  refunded: 'بازگشت داده شده',
};

const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  pending: 'badge-warning',
  paid: 'badge-success',
  rejected: 'badge-danger',
  refunded: 'badge-neutral',
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  online: 'پرداخت آنلاین',
  card_to_card: 'کارت به کارت',
  cash: 'نقدی',
};

const MISSION_STATUS_LABEL: Record<UserMissionStatus, string> = {
  available: 'در دسترس',
  completed: 'تکمیل شده',
  locked: 'قفل شده',
};

const MISSION_STATUS_COLOR: Record<UserMissionStatus, string> = {
  available: 'badge-info',
  completed: 'badge-success',
  locked: 'badge-neutral',
};

const WALLET_TRANSACTION_STATUS_LABEL: Record<WalletTransaction['status'], string> = {
  pending: 'در انتظار پرداخت',
  completed: 'انجام‌شده',
  failed: 'ناموفق',
};

const WALLET_TRANSACTION_STATUS_COLOR: Record<WalletTransaction['status'], string> = {
  pending: 'badge-warning',
  completed: 'badge-success',
  failed: 'badge-danger',
};

export function ProfileView() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>('dashboard');
  const [summary, setSummary] = useState<UserProfileSummary | null>(null);
  const [nazrs, setNazrs] = useState<Paginated<NazrRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    if (TABS.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab as ProfileTab);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.all([getProfileSummary(), getMyNazrRequests(1, 50)])
      .then(([profileSummary, userNazrs]) => {
        if (ignore) return;
        setSummary(profileSummary);
        setNazrs(userNazrs);
      })
      .catch((e) => {
        if (ignore) return;
        if (e instanceof ApiRequestError && e.statusCode === 401) {
          router.replace('/auth/login?redirect=/profile');
        } else {
          setError(e instanceof Error ? e.message : 'خطا در دریافت اطلاعات پروفایل');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [router]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileMenuOpen]);

  if (loading) {
    return (
      <main className="page-shell">
        <div className="profile-loading">در حال بارگذاری...</div>
      </main>
    );
  }

  if (error || !summary) {
    return (
      <main className="page-shell">
        <section className="surface-card">
          <p className="field-error">{error || 'اطلاعات پروفایل در دسترس نیست.'}</p>
        </section>
      </main>
    );
  }

  const activeTabLabel = TABS.find((tab) => tab.id === activeTab)?.label ?? 'داشبورد';

  function handleTabChange(tab: ProfileTab) {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  }

  return (
    <main className="page-shell profile-page-shell profile-standalone-shell">
      <div className="profile-mobile-bar">
        <div className="profile-mobile-account">
          <span className="profile-avatar" aria-hidden="true">{summary.profile.fullName.trim().charAt(0)}</span>
          <div>
            <strong>{summary.profile.fullName}</strong>
            <small>{activeTabLabel}</small>
          </div>
        </div>
        <div className="profile-mobile-actions">
          <Link className="profile-mobile-home" href="/">
            صفحه اصلی
          </Link>
          <button
            aria-controls="profile-navigation"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'بستن منوی پروفایل' : 'باز کردن منوی پروفایل'}
            className={`profile-menu-toggle${mobileMenuOpen ? ' is-open' : ''}`}
            onClick={() => setMobileMenuOpen((current) => !current)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <button
        aria-label="بستن منوی پروفایل"
        className={`profile-drawer-backdrop${mobileMenuOpen ? ' is-open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        tabIndex={mobileMenuOpen ? 0 : -1}
        type="button"
      />

      <aside
        className={`profile-sidebar surface-card${mobileMenuOpen ? ' is-open' : ''}`}
        id="profile-navigation"
        aria-label="بخش‌های پروفایل"
      >
        <div className="profile-sidebar-account">
          <span className="profile-avatar" aria-hidden="true">{summary.profile.fullName.trim().charAt(0)}</span>
          <div>
            <p className="profile-sidebar-title">{summary.profile.fullName}</p>
            <p className="profile-sidebar-subtitle" dir="ltr">{summary.profile.mobile}</p>
          </div>
          <button
            aria-label="بستن منوی پروفایل"
            className="profile-drawer-close"
            onClick={() => setMobileMenuOpen(false)}
            type="button"
          >
            ×
          </button>
        </div>

        <nav className="profile-nav">
          {TAB_GROUPS.map((group) => (
            <div className="profile-nav-group" key={group.label}>
              <p className="profile-nav-group-title">{group.label}</p>
              <div className="profile-nav-items">
                {group.tabs.map((tab) => (
                  <button
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                    className={`profile-nav-item${activeTab === tab.id ? ' is-active' : ''}`}
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <Link className="profile-home-link" href="/">
          بازگشت به صفحه اصلی
        </Link>
      </aside>

      <section className="profile-content">
        {activeTab === 'dashboard' && (
          <DashboardPanel
            nazrs={nazrs?.items ?? []}
            onNavigate={setActiveTab}
            onSummaryChange={setSummary}
            summary={summary}
          />
        )}
        {activeTab === 'account' && (
          <AccountPanel
            onProfileChange={(profile) => setSummary({ ...summary, profile })}
            profile={summary.profile}
          />
        )}
        {activeTab === 'contributions' && <ContributionsPanel nazrs={nazrs?.items ?? []} summary={summary} />}
        {activeTab === 'payments' && <PaymentsPanel />}
        {activeTab === 'tickets' && <TicketsPanel />}
        {activeTab === 'notifications' && <NotificationsPanel />}
        {activeTab === 'wallet' && <WalletPanel />}
        {activeTab === 'club' && <ClubPanel summary={summary} />}
        {activeTab === 'gallery' && <GalleryPanel />}
        {activeTab === 'invite' && <InvitePanel />}
      </section>
    </main>
  );
}

function DashboardPanel({
  nazrs,
  onNavigate,
  onSummaryChange,
  summary,
}: {
  nazrs: NazrRequest[];
  onNavigate: (tab: ProfileTab) => void;
  onSummaryChange: (summary: UserProfileSummary) => void;
  summary: UserProfileSummary;
}) {
  const recent = nazrs.slice(0, 3);
  const firstName = summary.profile.fullName.trim().split(/\s+/)[0] || 'همراه عزیز';
  const [target, setTarget] = useState(summary.profile.motivationalTarget ?? '');
  const [targetStatus, setTargetStatus] = useState<{
    kind: 'error' | 'success';
    text: string;
  } | null>(null);
  const [savingTarget, setSavingTarget] = useState(false);
  const [editingTarget, setEditingTarget] = useState(
    !summary.profile.motivationalTarget?.trim(),
  );
  const savedTarget = summary.profile.motivationalTarget?.trim() ?? '';

  async function handleTargetSubmit(e: FormEvent) {
    e.preventDefault();
    setSavingTarget(true);
    setTargetStatus(null);
    try {
      const updated = await updateProfileGoal({ motivationalTarget: target.trim() || null });
      onSummaryChange({
        ...summary,
        profile: { ...summary.profile, motivationalTarget: updated.motivationalTarget },
      });
      setTargetStatus({
        kind: 'success',
        text: updated.motivationalTarget ? 'هدف شخصی ذخیره شد.' : 'هدف شخصی حذف شد.',
      });
      setEditingTarget(!updated.motivationalTarget);
    } catch (err) {
      setTargetStatus({
        kind: 'error',
        text: err instanceof ApiRequestError ? err.message : 'ذخیره هدف انجام نشد.',
      });
    } finally {
      setSavingTarget(false);
    }
  }

  return (
    <div className="profile-stack dashboard-stack">
      <section className={`dashboard-goal-banner${savedTarget ? ' has-goal' : ' is-empty'}`}>
        <div className="dashboard-goal-banner-copy">
          <p className="dashboard-goal-eyebrow">
            {savedTarget ? 'هدف شخصی من' : 'یک قدم روشن برای خودت'}
          </p>
          {!editingTarget && savedTarget ? (
            <>
              <p className="dashboard-goal-statement">{savedTarget}</p>
              <p className="dashboard-goal-support">هر بار که برمی‌گردی، یادت باشد برای چه شروع کردی.</p>
            </>
          ) : (
            <>
              <h2>{savedTarget ? 'هدفت را تازه کن' : 'بیا هدفت را مشخص کن'}</h2>
              <p className="dashboard-goal-support">
                یک جمله کوتاه بنویس که با دیدنش برای ادامه مسیر انگیزه بگیری.
              </p>
              <form className="dashboard-goal-form" onSubmit={handleTargetSubmit}>
                <textarea
                  aria-label="هدف شخصی"
                  className="field-input profile-textarea dashboard-goal-input"
                  maxLength={500}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="مثلاً امسال در سه طرح نذر شرکت کنم."
                  value={target}
                />
                <div className="dashboard-goal-form-footer">
                  <span className="dashboard-character-count">{target.length.toLocaleString('fa-IR')}/۵۰۰</span>
                  <div className="dashboard-goal-form-actions">
                    {savedTarget && (
                      <button
                        className="dashboard-goal-cancel"
                        onClick={() => {
                          setTarget(savedTarget);
                          setTargetStatus(null);
                          setEditingTarget(false);
                        }}
                        type="button"
                      >
                        انصراف
                      </button>
                    )}
                    <button
                      className="btn-primary dashboard-goal-submit"
                      disabled={savingTarget || (!target.trim() && !savedTarget)}
                      type="submit"
                    >
                      {savingTarget
                        ? 'در حال ذخیره...'
                        : savedTarget && !target.trim()
                          ? 'حذف هدف'
                          : 'ذخیره هدف'}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
          {targetStatus && (
            <p
              aria-live="polite"
              className={targetStatus.kind === 'success' ? 'dashboard-goal-message is-success' : 'dashboard-goal-message is-error'}
            >
              {targetStatus.text}
            </p>
          )}
        </div>
        {!editingTarget && savedTarget && (
          <button
            className="dashboard-goal-edit"
            onClick={() => {
              setTargetStatus(null);
              setEditingTarget(true);
            }}
            type="button"
          >
            ویرایش هدف
          </button>
        )}
      </section>

      <section className="surface-card dashboard-welcome">
        <div className="dashboard-welcome-copy">
          <p className="dashboard-kicker">سلام {firstName}</p>
          <h1 className="dashboard-title">نمای کلی حساب شما</h1>
          <p className="dashboard-subtitle">هر نذر کوچک، یک چراغ روشن‌تر.</p>
          <div className="dashboard-welcome-actions">
            <Link className="btn-primary" href="/nazr/new">
              ثبت نذر جدید
            </Link>
            <button className="btn-ghost" onClick={() => onNavigate('contributions')} type="button">
              مشاهده مشارکت‌ها
            </button>
          </div>
        </div>

        <div className="dashboard-attention" aria-label="موارد نیازمند پیگیری">
          <p className="dashboard-attention-title">نیازمند پیگیری</p>
          <DashboardAttentionItem
            count={summary.contributions.awaitingPaymentRequests}
            label="پرداخت ناتمام"
            onClick={() => onNavigate('contributions')}
          />
          <DashboardAttentionItem
            count={summary.openTickets}
            label="تیکت باز"
            onClick={() => onNavigate('tickets')}
          />
          <DashboardAttentionItem
            count={summary.unreadNotifications}
            label="اعلان خوانده‌نشده"
            onClick={() => onNavigate('notifications')}
          />
        </div>
      </section>

      <section className="dashboard-stat-grid" aria-label="خلاصه حساب">
        <DashboardStatCard label="کل مشارکت‌ها" tone="primary" value={summary.contributions.totalRequests.toLocaleString('fa-IR')} />
        <DashboardStatCard label="مبلغ پرداخت‌شده" tone="success" value={formatMoney(summary.payments.totalPaidAmount)} />
        <DashboardStatCard label="نذرهای تکمیل‌شده" tone="warm" value={summary.contributions.completedRequests.toLocaleString('fa-IR')} />
        <DashboardStatCard label="امتیاز باشگاه" tone="neutral" value={summary.club.points.toLocaleString('fa-IR')} />
      </section>

      <div className="dashboard-content-grid">
        <RecentActivities
          hasMore={nazrs.length > recent.length}
          items={recent}
          onViewAll={() => onNavigate('contributions')}
        />

        <div className="dashboard-side-column">
          <section className="surface-card dashboard-shortcuts">
            <h2 className="card-title">دسترسی سریع</h2>
            <DashboardShortcut
              detail={`${summary.payments.totalPayments.toLocaleString('fa-IR')} واریز ثبت‌شده`}
              label="واریزهای من"
              onClick={() => onNavigate('payments')}
            />
            <DashboardShortcut
              detail={`${summary.openTickets.toLocaleString('fa-IR')} تیکت باز`}
              label="پشتیبانی و تیکت‌ها"
              onClick={() => onNavigate('tickets')}
            />
            <DashboardShortcut
              detail={`${summary.club.points.toLocaleString('fa-IR')} امتیاز · سطح ${summary.club.level}`}
              label="باشگاه همراهان"
              onClick={() => onNavigate('club')}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function RecentActivities({
  hasMore = false,
  items,
  onViewAll,
}: {
  hasMore?: boolean;
  items: NazrRequest[];
  onViewAll?: () => void;
}) {
  const [paymentError, setPaymentError] = useState('');
  const [startingPaymentId, setStartingPaymentId] = useState<string | null>(null);

  async function handleContinuePayment(requestId: string) {
    setPaymentError('');
    setStartingPaymentId(requestId);
    try {
      const payment = await startOnlineNazrPayment(requestId);
      window.location.href = payment.paymentUrl;
    } catch (e) {
      setPaymentError(e instanceof ApiRequestError ? e.message : 'اتصال به پرداخت انجام نشد.');
      setStartingPaymentId(null);
    }
  }

  return (
    <section className="surface-card dashboard-activities">
      <div className="dashboard-panel-heading dashboard-activities-heading">
        <div>
          <h2 className="card-title">فعالیت‌های اخیر</h2>
          <p className="profile-muted">آخرین نذرها و وضعیت پیگیری آن‌ها</p>
        </div>
        {onViewAll && (items.length > 0 || hasMore) && (
          <button className="dashboard-text-button" onClick={onViewAll} type="button">
            مشاهده همه
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="dashboard-empty-activity">
          <EmptyState title="هنوز مشارکتی ثبت نشده است" body="بعد از ثبت اولین نذر، وضعیت آن را از همین بخش پیگیری می‌کنید." />
          <Link className="btn-primary" href="/nazr/new">ثبت اولین نذر</Link>
        </div>
      ) : (
        <div className="profile-list dashboard-activity-list">
          {items.map((item) => (
            <article className="profile-list-row dashboard-activity-row" key={item.id}>
              <div className="profile-list-head">
                <div className="profile-list-main">
                  <p className="profile-list-title">{item.nazrType.title}</p>
                  <p className="profile-tracking-code">
                    کد رهگیری: <span dir="ltr">{item.trackingCode}</span>
                  </p>
                </div>
                <span className={STATUS_COLOR[item.status]}>{STATUS_LABEL[item.status]}</span>
              </div>
              <div className="profile-list-info">
                <ProfileRecentInfo label="مبلغ" value={formatMoney(item.amount)} />
                <ProfileRecentInfo label="تاریخ ثبت" value={formatDate(item.createdAt)} />
              </div>
              {item.status === 'awaiting_payment' && (
                <div className="profile-row-actions">
                  <button
                    className="profile-pay-link"
                    disabled={startingPaymentId === item.id}
                    onClick={() => handleContinuePayment(item.id)}
                    type="button"
                  >
                    {startingPaymentId === item.id ? 'در حال اتصال...' : 'ادامه پرداخت'}
                  </button>
                </div>
              )}
              {(item.status === 'confirmed' || item.status === 'completed') && (
                <div className="profile-row-actions">
                  <Link className="profile-pay-link" href={`/nazr/new?type=${item.nazrType.slug}`}>
                    مشارکت دوباره
                  </Link>
                </div>
              )}
            </article>
          ))}
          {paymentError && <p className="field-error">{paymentError}</p>}
        </div>
      )}
    </section>
  );
}

function DashboardAttentionItem({
  count,
  label,
  onClick,
}: {
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="dashboard-attention-item" onClick={onClick} type="button">
      <span>{label}</span>
      <strong>{count.toLocaleString('fa-IR')}</strong>
    </button>
  );
}

function DashboardStatCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'neutral' | 'primary' | 'success' | 'warm';
  value: string;
}) {
  return (
    <div className={`dashboard-stat-card is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DashboardShortcut({
  detail,
  label,
  onClick,
}: {
  detail: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="dashboard-shortcut" onClick={onClick} type="button">
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span aria-hidden="true" className="dashboard-shortcut-arrow">←</span>
    </button>
  );
}

function AccountPanel({
  onProfileChange,
  profile,
}: {
  onProfileChange: (profile: UserProfileDetails) => void;
  profile: UserProfileDetails;
}) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [mobile, setMobile] = useState(profile.mobile);
  const [eitaNumber, setEitaNumber] = useState(profile.eitaNumber ?? '');
  const [platforms, setPlatforms] = useState<UserPlatform[]>(profile.activePlatforms);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const updated = await updateProfileDetails({
        activePlatforms: platforms,
        eitaNumber: eitaNumber.trim() || null,
        fullName,
        mobile,
      });
      onProfileChange(updated);
      setMessage('اطلاعات حساب ذخیره شد.');
    } catch (err) {
      setMessage(err instanceof ApiRequestError ? err.message : 'ذخیره اطلاعات انجام نشد.');
    } finally {
      setSaving(false);
    }
  }

  function togglePlatform(platform: UserPlatform) {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  }

  return (
    <div className="profile-stack account-stack">
      <section className="surface-card account-details-card">
        <header className="account-heading">
          <div className="account-identity">
            <span className="profile-avatar" aria-hidden="true">{profile.fullName.trim().charAt(0)}</span>
            <div>
              <h1 className="card-title">اطلاعات حساب</h1>
              <p className="profile-muted">عضویت از {formatDate(profile.createdAt)}</p>
            </div>
          </div>
          <span className="badge-success">حساب فعال</span>
        </header>

        <form className="account-form" onSubmit={handleSave}>
          <div className="account-form-grid">
            <Field className="account-field-wide" label="نام و نام خانوادگی" onChange={setFullName} value={fullName} />
            <Field dir="ltr" label="شماره همراه" onChange={setMobile} value={mobile} />
            <Field dir="ltr" label="شماره ایتا" onChange={setEitaNumber} required={false} value={eitaNumber} />
          </div>

          <div className="account-platforms">
            <div>
              <span className="field-label">پلتفرم‌های فعالیت</span>
              <p className="profile-muted">شبکه‌هایی را که در آن‌ها فعال هستید انتخاب کنید.</p>
            </div>
            <div className="profile-chip-grid">
              {PLATFORM_OPTIONS.map((option) => {
                const selected = platforms.includes(option.id);
                return (
                  <label className={`profile-chip account-platform-chip${selected ? ' is-selected' : ''}`} key={option.id}>
                    <input
                      checked={selected}
                      onChange={() => togglePlatform(option.id)}
                      type="checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="account-form-actions">
            {message && (
              <p className={message.includes('ذخیره شد') ? 'field-success' : 'field-error'}>{message}</p>
            )}
            <button className="btn-primary" disabled={saving} type="submit">
              {saving ? 'در حال ذخیره...' : 'ذخیره اطلاعات'}
            </button>
          </div>
        </form>
      </section>
      <ChangePasswordCard />
    </div>
  );
}

function ContributionsPanel({ nazrs, summary }: { nazrs: NazrRequest[]; summary: UserProfileSummary }) {
  return (
    <div className="profile-stack contributions-stack">
      <section className="surface-card contributions-overview">
        <div className="contributions-heading">
          <div>
            <h1 className="card-title">مشارکت‌های من</h1>
            <p className="profile-muted">خلاصه همراهی شما در همه طرح‌های نذر</p>
          </div>
          <Link className="btn-primary" href="/nazr/new">ثبت نذر جدید</Link>
        </div>
        <div className="contributions-summary-grid">
          <DashboardStatCard label="کل مشارکت‌ها" tone="primary" value={summary.contributions.totalRequests.toLocaleString('fa-IR')} />
          <DashboardStatCard label="مبلغ کل" tone="success" value={formatMoney(summary.contributions.totalAmount)} />
          <DashboardStatCard label="تکمیل‌شده" tone="warm" value={summary.contributions.completedRequests.toLocaleString('fa-IR')} />
          <DashboardStatCard label="منتظر پرداخت" tone="neutral" value={summary.contributions.awaitingPaymentRequests.toLocaleString('fa-IR')} />
        </div>
      </section>

      <section className="surface-card contributions-plans">
        <div className="contributions-section-heading">
          <div>
            <h2 className="card-title">سهم من در طرح‌ها</h2>
            <p className="profile-muted">هر ردیف سهم مبلغی شما از کل مشارکت‌ها را نشان می‌دهد.</p>
          </div>
          <span>{summary.contributions.byNazrType.length.toLocaleString('fa-IR')} طرح</span>
        </div>
        <div className="profile-progress-list contributions-plan-list">
          {summary.contributions.byNazrType.length === 0 ? (
            <EmptyState title="هنوز مشارکتی ثبت نشده است" body="با ثبت نذر، سهم شما در هر طرح اینجا دیده می‌شود." />
          ) : (
            summary.contributions.byNazrType.map((item) => {
              const slug = nazrs.find((nazr) => nazr.nazrType.id === item.nazrTypeId)?.nazrType.slug;
              return (
                <Link className="profile-progress-row contribution-plan-row" href={slug ? `/nazr/new?type=${slug}` : '/nazr/new'} key={item.nazrTypeId}>
                  <div className="contribution-plan-head">
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.count.toLocaleString('fa-IR')} مشارکت · {formatMoney(item.totalAmount)}</span>
                    </div>
                    <b>{item.sharePercent.toLocaleString('fa-IR')}٪</b>
                  </div>
                  <div className="profile-progress-track" aria-label={`${item.sharePercent.toLocaleString('fa-IR')} درصد از مشارکت‌ها`}>
                    <span style={{ inlineSize: `${Math.max(6, item.sharePercent)}%` }} />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>
      {nazrs.length > 0 && <RecentActivities items={nazrs} />}
    </div>
  );
}

function PaymentsPanel() {
  const [payments, setPayments] = useState<Paginated<Payment> | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getProfilePayments(1, 20, search).then(setPayments).catch(() => setPayments(null));
  }, [search]);

  return (
    <section className="surface-card">
      <div className="profile-section-heading">
        <div>
          <h1 className="card-title">واریزهای من</h1>
          <p className="profile-muted">تاریخچه پرداخت‌ها و ریزجزئیات قابل جستجو</p>
        </div>
        <input
          className="field-input profile-search"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در واریزها"
          value={search}
        />
      </div>
      <div className="profile-list">
        {!payments || payments.items.length === 0 ? (
          <EmptyState title="واریزی برای نمایش وجود ندارد" body="بعد از تکمیل پرداخت، جزئیات اینجا نمایش داده می‌شود." />
        ) : (
          payments.items.map((payment) => (
            <div className="profile-list-row" key={payment.id}>
              <div className="profile-list-head">
                <p className="profile-list-title">{formatMoney(payment.amount)}</p>
                <span className={PAYMENT_STATUS_COLOR[payment.status]}>
                  {PAYMENT_STATUS_LABEL[payment.status]}
                </span>
              </div>
              <div className="profile-list-info">
                <ProfileRecentInfo label="روش" value={PAYMENT_METHOD_LABEL[payment.method]} />
                <ProfileRecentInfo label="تاریخ" value={formatDate(payment.createdAt)} />
                {payment.transactionReference && <ProfileRecentInfo label="کد تراکنش" value={payment.transactionReference} />}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function TicketsPanel() {
  const [tickets, setTickets] = useState<Paginated<Ticket> | null>(null);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [replyBody, setReplyBody] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  async function loadTickets() {
    setTickets(await getMyTickets(1, 20));
  }

  useEffect(() => {
    loadTickets().catch(() => setTickets(null));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      await createTicket({ body, subject });
      setSubject('');
      setBody('');
      setMessage('تیکت ثبت شد.');
      await loadTickets();
      setView('list');
    } catch (err) {
      setMessage(err instanceof ApiRequestError ? err.message : 'ثبت تیکت انجام نشد.');
    }
  }

  async function handleReply(ticketId: string) {
    const text = replyBody[ticketId]?.trim();
    if (!text) return;
    await replyTicket(ticketId, text);
    setReplyBody((current) => ({ ...current, [ticketId]: '' }));
    await loadTickets();
  }

  async function handleClose(ticketId: string) {
    await closeTicket(ticketId);
    await loadTickets();
  }

  if (view === 'create') {
    return (
      <section className="surface-card profile-ticket-create">
        <div className="profile-section-heading profile-ticket-create-heading">
          <div>
            <h1 className="card-title">ثبت تیکت جدید</h1>
            <p className="profile-muted">پیام شما مستقیماً برای پشتیبانی سایت ارسال می‌شود.</p>
          </div>
          <button className="btn-ghost" onClick={() => setView('list')} type="button">بازگشت به تیکت‌ها</button>
        </div>
        <form className="field-stack" onSubmit={handleCreate}>
          <Field label="موضوع" onChange={setSubject} value={subject} />
          <textarea
            className="field-input profile-textarea"
            onChange={(e) => setBody(e.target.value)}
            placeholder="پیام خود را بنویسید"
            required
            value={body}
          />
          {message && <p className="profile-muted">{message}</p>}
          <button className="btn-primary profile-ticket-submit" type="submit">ارسال تیکت</button>
        </form>
      </section>
    );
  }

  return (
    <section className="profile-ticket-section">
      <div className="surface-card profile-ticket-list-header">
        <div>
          <h1 className="card-title">تیکت‌های من</h1>
          <p className="profile-muted">گفتگوها و پاسخ‌های پشتیبانی را از اینجا پیگیری کنید.</p>
        </div>
        <div className="profile-ticket-list-actions">
          {tickets ? <span className="profile-ticket-count">{tickets.total.toLocaleString('fa-IR')} گفتگو</span> : null}
          <button className="btn-primary" onClick={() => { setMessage(''); setView('create'); }} type="button">
            ثبت تیکت جدید
          </button>
        </div>
      </div>
      {message && <p className="field-success">{message}</p>}
      <div className="profile-ticket-list">
        {!tickets || tickets.items.length === 0 ? (
          <div className="surface-card">
            <EmptyState title="تیکتی وجود ندارد" body="برای شروع گفتگو با پشتیبانی، تیکت جدیدی ثبت کنید." />
          </div>
        ) : (
          tickets.items.map((ticket) => (
            <article className="profile-ticket-card" key={ticket.id}>
              <header className="profile-ticket-header">
                <div>
                  <h3>{ticket.subject}</h3>
                  <p>ایجاد شده در {formatDate(ticket.createdAt)}</p>
                </div>
                <span className={TICKET_STATUS_CLASS[ticket.status]}>{TICKET_STATUS_LABEL[ticket.status]}</span>
              </header>

              <div className="profile-ticket-thread">
                {ticket.messages.map((item) => (
                  <div className={`profile-ticket-bubble-row ${item.authorType === 'user' ? 'is-own' : ''}`} key={item.id}>
                    <div className="profile-ticket-bubble">
                      <span>{item.authorType === 'support' ? 'پشتیبانی' : 'شما'}</span>
                      <p>{item.body}</p>
                      <time>{formatTicketDate(item.createdAt)}</time>
                    </div>
                  </div>
                ))}
              </div>

              {ticket.status !== 'closed' && (
                <div className="profile-ticket-reply">
                  <textarea
                    className="field-input profile-ticket-reply-input"
                    onChange={(e) => setReplyBody((current) => ({ ...current, [ticket.id]: e.target.value }))}
                    placeholder="پاسخ خود را بنویسید..."
                    rows={2}
                    value={replyBody[ticket.id] ?? ''}
                  />
                  <div>
                    <button className="btn-ghost" onClick={() => handleClose(ticket.id)} type="button">بستن تیکت</button>
                    <button className="btn-primary" disabled={!replyBody[ticket.id]?.trim()} onClick={() => handleReply(ticket.id)} type="button">ارسال پاسخ</button>
                  </div>
                </div>
              )}
              {ticket.status === 'closed' ? <p className="profile-ticket-closed">این گفتگو بسته شده است.</p> : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Paginated<NotificationItem> | null>(null);

  async function loadNotifications() {
    setNotifications(await getNotifications(1, 20));
  }

  useEffect(() => {
    loadNotifications().catch(() => setNotifications(null));
  }, []);

  async function handleRead(id: string) {
    await markNotificationAsRead(id);
    await loadNotifications();
  }

  return (
    <section className="surface-card">
      <h1 className="card-title">اعلان‌ها</h1>
      <div className="profile-list">
        {!notifications || notifications.items.length === 0 ? (
          <EmptyState title="اعلان جدیدی ندارید" body="پیام‌های مهم حساب و وضعیت نذرها اینجا نمایش داده می‌شوند." />
        ) : (
          notifications.items.map((item) => (
            <div className="profile-list-row" key={item.id}>
              <div className="profile-list-head">
                <p className="profile-list-title">{item.title}</p>
                <span className={item.isRead ? 'badge-neutral' : 'badge-info'}>{item.isRead ? 'خوانده شده' : 'جدید'}</span>
              </div>
              <p className="profile-muted">{item.body}</p>
              {!item.isRead && (
                <button className="profile-pay-link" onClick={() => handleRead(item.id)} type="button">
                  خواندم
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function WalletPanel() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [charge, setCharge] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [monthlyEnabled, setMonthlyEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingAction, setSavingAction] = useState<'charge' | 'settings' | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const chargeAmount = useMemo(() => parseAmountInput(charge), [charge]);
  const monthlyAmountValue = useMemo(
    () => parseAmountInput(monthlyAmount),
    [monthlyAmount],
  );
  const chargeInWords = useMemo(
    () => amountToPersianWords(chargeAmount),
    [chargeAmount],
  );
  const monthlyAmountInWords = useMemo(
    () => amountToPersianWords(monthlyAmountValue),
    [monthlyAmountValue],
  );

  async function loadWallet() {
    const [walletData, transactionData] = await Promise.all([getProfileWallet(), getWalletTransactions()]);
    setWallet(walletData);
    setTransactions(transactionData);
    setMonthlyEnabled(walletData.isMonthlyDeductionEnabled);
    setMonthlyAmount(
      walletData.monthlyDeductionAmount?.amount
        ? formatAmountInput(walletData.monthlyDeductionAmount.amount)
        : '',
    );
  }

  useEffect(() => {
    const chargeStatus = new URLSearchParams(window.location.search).get('walletCharge');
    if (chargeStatus === 'paid') {
      setMessage({ kind: 'success', text: 'پرداخت تأیید شد و کیف پول شارژ شد.' });
    } else if (chargeStatus === 'cancelled') {
      setMessage({ kind: 'error', text: 'پرداخت توسط شما لغو شد و موجودی تغییری نکرد.' });
    } else if (chargeStatus === 'failed') {
      setMessage({ kind: 'error', text: 'پرداخت تأیید نشد و موجودی تغییری نکرد.' });
    }
    if (chargeStatus) {
      window.history.replaceState(null, '', '/profile?tab=wallet');
    }
    loadWallet()
      .catch(() => setError('اطلاعات کیف پول دریافت نشد. دوباره تلاش کنید.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCharge(e: FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(chargeAmount) || chargeAmount <= 0) return;
    setSavingAction('charge');
    setMessage(null);
    try {
      const started = await createWalletCharge({
        amount: { amount: chargeAmount, currency: 'IRT' },
      });
      window.location.assign(started.paymentUrl);
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof ApiRequestError ? err.message : 'شروع پرداخت شارژ انجام نشد.',
      });
    } finally {
      setSavingAction(null);
    }
  }

  async function handleSettings(e: FormEvent) {
    e.preventDefault();
    if (
      monthlyEnabled &&
      (!Number.isFinite(monthlyAmountValue) || monthlyAmountValue <= 0)
    ) return;
    setSavingAction('settings');
    setMessage(null);
    try {
      const updated = await updateProfileWallet({
        isMonthlyDeductionEnabled: monthlyEnabled,
        monthlyDeductionAmount: monthlyEnabled
          ? { amount: monthlyAmountValue, currency: 'IRT' }
          : null,
      });
      setWallet(updated);
      setMonthlyAmount(
        updated.monthlyDeductionAmount?.amount
          ? formatAmountInput(updated.monthlyDeductionAmount.amount)
          : '',
      );
      setMessage({ kind: 'success', text: 'تنظیمات پرداخت ماهانه ذخیره شد.' });
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof ApiRequestError ? err.message : 'ذخیره تنظیمات انجام نشد.',
      });
    } finally {
      setSavingAction(null);
    }
  }

  async function handleRetry() {
    setLoading(true);
    setError('');
    try {
      await loadWallet();
    } catch {
      setError('اطلاعات کیف پول دریافت نشد. دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="surface-card wallet-state">در حال دریافت اطلاعات کیف پول...</div>;
  }

  if (error || !wallet) {
    return (
      <section className="surface-card wallet-state">
        <p className="field-error">{error || 'اطلاعات کیف پول در دسترس نیست.'}</p>
        <button className="btn-ghost" onClick={handleRetry} type="button">تلاش دوباره</button>
      </section>
    );
  }

  return (
    <div className="profile-stack wallet-stack">
      <section className="surface-card wallet-overview">
        <div className="wallet-overview-main">
          <p className="wallet-eyebrow">کیف پول من</p>
          <h1 className="wallet-balance">{formatMoney(wallet.balance)}</h1>
          <p className="profile-muted">موجودی قابل استفاده برای مشارکت در طرح‌های نذر</p>
        </div>
        <div className={`wallet-monthly-status${wallet.isMonthlyDeductionEnabled ? ' is-active' : ''}`}>
          <span aria-hidden="true" />
          <div>
            <strong>{wallet.isMonthlyDeductionEnabled ? 'پرداخت ماهانه فعال است' : 'پرداخت ماهانه غیرفعال است'}</strong>
            <small>
              {wallet.isMonthlyDeductionEnabled && wallet.monthlyDeductionAmount
                ? `${formatMoney(wallet.monthlyDeductionAmount)} در هر ماه${
                    wallet.nextMonthlyDeductionAt
                      ? ` · سررسید بعدی ${formatDate(wallet.nextMonthlyDeductionAt)}`
                      : ''
                  }`
                : 'در صورت نیاز از بخش تنظیمات فعال کنید'}
            </small>
          </div>
        </div>
      </section>

      {message && (
        <p aria-live="polite" className={message.kind === 'success' ? 'field-success' : 'field-error'}>
          {message.text}
        </p>
      )}

      <div className="wallet-action-grid">
        <section className="surface-card wallet-action-card">
          <div className="wallet-section-heading">
            <h2 className="card-title">شارژ کیف پول</h2>
            <p className="profile-muted">پس از پرداخت موفق در زرین‌پال، موجودی افزایش پیدا می‌کند.</p>
          </div>
          <form className="profile-wallet-grid" onSubmit={handleCharge}>
            <label className="field-group">
              <span className="field-label">مبلغ شارژ</span>
              <span className="wallet-amount-field">
                <input
                  className="field-input"
                  dir="ltr"
                  inputMode="numeric"
                  onChange={(e) => setCharge(formatAmountInput(e.target.value))}
                  placeholder="300,000"
                  required
                  type="text"
                  value={charge}
                />
                <span>تومان</span>
              </span>
              <small className="wallet-amount-words">{chargeInWords}</small>
            </label>
            <button className="btn-primary" disabled={savingAction !== null || chargeAmount <= 0} type="submit">
              {savingAction === 'charge' ? 'در حال انتقال...' : 'پرداخت و شارژ'}
            </button>
          </form>
        </section>

        <section className="surface-card wallet-action-card">
          <div className="wallet-section-heading">
            <h2 className="card-title">پرداخت ماهانه</h2>
            <p className="profile-muted">مبلغ ثابتی را برای مشارکت ماهانه تعیین کنید.</p>
          </div>
          <form className="profile-wallet-grid" onSubmit={handleSettings}>
            <label className="wallet-toggle-row">
              <span>
                <strong>برداشت خودکار ماهانه</strong>
                <small>{monthlyEnabled ? 'روشن' : 'خاموش'}</small>
              </span>
              <input
                checked={monthlyEnabled}
                onChange={(e) => setMonthlyEnabled(e.target.checked)}
                type="checkbox"
              />
              <span aria-hidden="true" className="wallet-toggle-track"><span /></span>
            </label>
            <label className="field-group">
              <span className="field-label">مبلغ برداشت ماهانه</span>
              <span className="wallet-amount-field">
                <input
                  className="field-input"
                  dir="ltr"
                  disabled={!monthlyEnabled}
                  inputMode="numeric"
                  onChange={(e) => setMonthlyAmount(formatAmountInput(e.target.value))}
                  placeholder="300,000"
                  required={monthlyEnabled}
                  type="text"
                  value={monthlyAmount}
                />
                <span>تومان</span>
              </span>
              <small className="wallet-amount-words">{monthlyAmountInWords}</small>
            </label>
            <button
              className="btn-ghost"
              disabled={savingAction !== null || (monthlyEnabled && monthlyAmountValue <= 0)}
              type="submit"
            >
              {savingAction === 'settings' ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
            </button>
          </form>
        </section>
      </div>

      <section className="surface-card wallet-transactions">
        <div className="wallet-transactions-heading">
          <div>
            <h2 className="card-title">تراکنش‌های کیف پول</h2>
            <p className="profile-muted">ریز شارژها، پرداخت‌ها و برداشت‌های انجام‌شده</p>
          </div>
          <span>{transactions.length.toLocaleString('fa-IR')} تراکنش</span>
        </div>
        <div className="wallet-transaction-list">
          {transactions.length === 0 ? (
            <EmptyState title="تراکنشی وجود ندارد" body="شارژها و برداشت‌های کیف پول اینجا نمایش داده می‌شوند." />
          ) : (
            transactions.map((item) => {
              const completed = item.status === 'completed';
              const incoming = completed && (item.type === 'charge' || item.type === 'refund');
              const outgoing = completed && !incoming;
              return (
                <article className="wallet-transaction-row" key={item.id}>
                  <span className={`wallet-transaction-sign${incoming ? ' is-incoming' : outgoing ? ' is-outgoing' : ' is-neutral'}`} aria-hidden="true">
                    {incoming ? '+' : outgoing ? '−' : item.status === 'pending' ? '…' : '×'}
                  </span>
                  <div className="wallet-transaction-main">
                    <p>{item.description}</p>
                    <time>
                      {formatDate(item.createdAt)}
                      {item.transactionReference ? ` · پیگیری ${item.transactionReference}` : ''}
                    </time>
                  </div>
                  <div className="wallet-transaction-meta">
                    <strong className={incoming ? 'is-incoming' : outgoing ? 'is-outgoing' : ''}>
                      {incoming ? '+' : outgoing ? '−' : ''} {formatMoney(item.amount)}
                    </strong>
                    <span className={WALLET_TRANSACTION_STATUS_COLOR[item.status]}>
                      {WALLET_TRANSACTION_STATUS_LABEL[item.status]}
                    </span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function ClubPanel({ summary }: { summary: UserProfileSummary }) {
  return (
    <section className="surface-card">
      <h1 className="card-title">باشگاه همراهان</h1>
      <div className="profile-stat-grid">
        <StatCard label="سطح" value={summary.club.level} />
        <StatCard label="امتیاز" value={summary.club.points.toLocaleString('fa-IR')} />
        <StatCard label="روز همراهی" value={summary.club.joinedDays.toLocaleString('fa-IR')} />
      </div>
      <div className="profile-list profile-section-gap">
        {summary.club.missions.map((mission) => (
          <div className="profile-list-row" key={mission.id}>
            <div className="profile-list-head">
              <p className="profile-list-title">{mission.title}</p>
              <span className={MISSION_STATUS_COLOR[mission.status]}>
                {MISSION_STATUS_LABEL[mission.status]}
              </span>
            </div>
            <p className="profile-muted">{mission.description}</p>
            <ProfileRecentInfo label="امتیاز" value={mission.points.toLocaleString('fa-IR')} />
          </div>
        ))}
      </div>
    </section>
  );
}

function GalleryPanel() {
  const [assets, setAssets] = useState<GalleryAsset[]>([]);

  useEffect(() => {
    getProfileGallery().then(setAssets).catch(() => setAssets([]));
  }, []);

  return (
    <section className="surface-card">
      <h1 className="card-title">گالری دریافت‌ها</h1>
      {assets.length === 0 ? (
        <EmptyState title="فعلاً فایل گالری ثبت نشده است" body="عکس‌ها و ویدئوهای طرح‌ها بعد از ثبت توسط مدیریت اینجا قابل دریافت خواهند بود." />
      ) : (
        <div className="profile-gallery-grid">
          {assets.map((asset) => (
            <a className="profile-gallery-item" href={asset.fileUrl} key={asset.id} rel="noreferrer" target="_blank">
              <span>{asset.type === 'image' ? 'عکس' : 'ویدئو'}</span>
              <strong>{asset.title}</strong>
              <small>دریافت فایل</small>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function InvitePanel() {
  const [cards, setCards] = useState<InvitationCard[]>([]);
  const [friendName, setFriendName] = useState('');
  const [friendMobile, setFriendMobile] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  async function loadCards() {
    setCards(await getInvitationCards());
  }

  useEffect(() => {
    loadCards().catch(() => setCards([]));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await createInvitationCard({ friendName, friendMobile: friendMobile || null });
      setFriendName('');
      setFriendMobile('');
      setMessage({ kind: 'success', text: 'دعوت‌نامه با موفقیت ساخته شد.' });
      await loadCards();
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof ApiRequestError ? err.message : 'ساخت دعوت‌نامه انجام نشد.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-stack invite-stack">
      <section className="surface-card invite-builder">
        <div className="invite-builder-copy">
          <p className="invite-eyebrow">دعوت به یک کار خوب</p>
          <h1 className="card-title">دعوت‌نامه شخصی بسازید</h1>
          <p className="profile-muted">نام دوستتان را وارد کنید تا متن دعوت آماده دریافت شود.</p>
        </div>
        <form className="invite-form" onSubmit={handleCreate}>
          <div className="invite-form-grid">
            <Field label="نام دوست" onChange={setFriendName} value={friendName} />
            <Field dir="ltr" label="شماره همراه دوست" onChange={setFriendMobile} required={false} value={friendMobile} />
          </div>
          {message && (
            <p className={message.kind === 'success' ? 'field-success' : 'field-error'}>{message.text}</p>
          )}
          <button className="btn-primary" disabled={saving || !friendName.trim()} type="submit">
            {saving ? 'در حال ساخت...' : 'ساخت دعوت‌نامه'}
          </button>
        </form>
      </section>

      <section className="surface-card invite-archive">
        <div className="invite-archive-heading">
          <div>
            <h2 className="card-title">دعوت‌نامه‌های ساخته‌شده</h2>
            <p className="profile-muted">متن هر دعوت‌نامه را دریافت و برای دوستتان ارسال کنید.</p>
          </div>
          <span>{cards.length.toLocaleString('fa-IR')} دعوت‌نامه</span>
        </div>
        <div className="invite-list">
          {cards.length === 0 ? (
            <EmptyState title="هنوز کارت دعوتی ساخته نشده است" body="با وارد کردن نام دوست، متن دعوت آماده دریافت می‌شود." />
          ) : (
            cards.map((card) => (
              <article className="invite-card-row" key={card.id}>
                <header>
                  <div>
                    <strong>{card.friendName}</strong>
                    <time>{formatDate(card.createdAt)}</time>
                  </div>
                  <span className="badge-info">آماده ارسال</span>
                </header>
                <p>{card.downloadText}</p>
                <a
                  className="btn-ghost invite-download"
                  download={`nazr-invite-${card.friendName}.txt`}
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(card.downloadText)}`}
                >
                  دریافت متن دعوت
                </a>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    if (newPassword !== confirmPassword) {
      setMessage('رمز عبور جدید و تکرار آن یکسان نیستند.');
      return;
    }
    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('رمز عبور با موفقیت تغییر کرد.');
    } catch (err) {
      setMessage(err instanceof ApiRequestError ? err.message : 'تغییر رمز عبور انجام نشد.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface-card account-password-card">
      <div className="account-password-heading">
        <h2 className="card-title">تغییر گذرواژه</h2>
        <p className="profile-muted">برای امنیت حساب، گذرواژه جدید را در هر دو فیلد یکسان وارد کنید.</p>
      </div>
      <form className="account-password-form" onSubmit={handleSubmit}>
        <div className="account-password-grid">
          <PasswordField
            autoComplete="current-password"
            label="گذرواژه فعلی"
            onChange={setCurrentPassword}
            value={currentPassword}
          />
          <PasswordField
            autoComplete="new-password"
            label="گذرواژه جدید"
            onChange={setNewPassword}
            value={newPassword}
          />
          <PasswordField
            autoComplete="new-password"
            label="تکرار گذرواژه جدید"
            onChange={setConfirmPassword}
            value={confirmPassword}
          />
        </div>
        {message && <p className={message.includes('موفقیت') ? 'field-success' : 'field-error'}>{message}</p>}
        <button className="btn-primary" disabled={saving} type="submit">
          {saving ? 'در حال ذخیره...' : 'تغییر گذرواژه'}
        </button>
      </form>
    </section>
  );
}

function ProfileRecentInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="profile-recent-info-label">{label}: </span>
      <span className="profile-recent-info-value">{value}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-stat-card">
      <span className="profile-stat-label">{label}</span>
      <strong className="profile-stat-value">{value}</strong>
    </div>
  );
}

function Field({
  autoComplete,
  className,
  dir,
  label,
  onChange,
  required = true,
  type = 'text',
  value,
}: {
  autoComplete?: string;
  className?: string;
  dir?: 'ltr' | 'rtl';
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className={`field-group${className ? ` ${className}` : ''}`}>
      <span className="field-label">{label}</span>
      <input
        autoComplete={autoComplete}
        className="field-input"
        dir={dir}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function PasswordField({
  autoComplete,
  label,
  onChange,
  value,
}: {
  autoComplete: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="field-group">
      <span className="field-label">{label}</span>
      <span className="relative block">
        <input
          autoComplete={autoComplete}
          className="field-input pr-10"
          dir="ltr"
          onChange={(e) => onChange(e.target.value)}
          type={visible ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={visible ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[var(--muted)] transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
    </label>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="profile-empty">
      <p className="profile-empty-title">{title}</p>
      <p className="profile-muted">{body}</p>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="15" viewBox="0 0 24 24" width="15">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="15" viewBox="0 0 24 24" width="15">
      <path d="m3 3 18 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M10.7 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.8 18.8 0 0 1-3.1 4.1M6.6 6.6C3.7 8.6 2 12 2 12s3.5 7 10 7c1.5 0 2.8-.3 4-.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M9.9 9.9A3 3 0 0 0 14.1 14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function formatMoney(money: { amount: number; currency: 'IRR' | 'IRT' }): string {
  return `${money.amount.toLocaleString('fa-IR')} ${money.currency === 'IRT' ? 'تومان' : 'ریال'}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTicketDate(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}
