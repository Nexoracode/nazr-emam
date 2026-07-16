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

const TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: 'dashboard', label: 'داشبورد' },
  { id: 'account', label: 'اطلاعات حساب' },
  { id: 'contributions', label: 'مشارکت‌ها' },
  { id: 'payments', label: 'واریزها' },
  { id: 'tickets', label: 'تیکت‌ها' },
  { id: 'notifications', label: 'اعلان‌ها' },
  { id: 'wallet', label: 'کیف پول' },
  { id: 'club', label: 'باشگاه' },
  { id: 'gallery', label: 'گالری' },
  { id: 'invite', label: 'دعوت دوستان' },
];

const PLATFORM_OPTIONS: Array<{ id: UserPlatform; label: string }> = [
  { id: 'eitaa', label: 'ایتا' },
  { id: 'instagram', label: 'اینستاگرام' },
  { id: 'telegram', label: 'تلگرام' },
  { id: 'whatsapp', label: 'واتساپ' },
  { id: 'website', label: 'وب‌سایت' },
  { id: 'other', label: 'سایر' },
];

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

export function ProfileView() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>('dashboard');
  const [summary, setSummary] = useState<UserProfileSummary | null>(null);
  const [nazrs, setNazrs] = useState<Paginated<NazrRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <main className="page-shell profile-page-shell">
      <aside className="profile-sidebar surface-card" aria-label="بخش‌های پروفایل">
        <div>
          <p className="profile-sidebar-title">{summary.profile.fullName}</p>
          <p className="profile-sidebar-subtitle" dir="ltr">{summary.profile.mobile}</p>
        </div>

        <nav className="profile-nav">
          {TABS.map((tab) => (
            <button
              className={`profile-nav-item${activeTab === tab.id ? ' is-active' : ''}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="profile-content">
        {activeTab === 'dashboard' && (
          <DashboardPanel
            nazrs={nazrs?.items ?? []}
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
  onSummaryChange,
  summary,
}: {
  nazrs: NazrRequest[];
  onSummaryChange: (summary: UserProfileSummary) => void;
  summary: UserProfileSummary;
}) {
  const recent = nazrs.slice(0, 3);
  const [target, setTarget] = useState(summary.profile.motivationalTarget ?? '');
  const [targetStatus, setTargetStatus] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  async function handleTargetSubmit(e: FormEvent) {
    e.preventDefault();
    setSavingTarget(true);
    setTargetStatus('');
    try {
      const updated = await updateProfileGoal({ motivationalTarget: target.trim() || null });
      onSummaryChange({
        ...summary,
        profile: { ...summary.profile, motivationalTarget: updated.motivationalTarget },
      });
      setTargetStatus('هدف شخصی ذخیره شد.');
    } catch (err) {
      setTargetStatus(err instanceof ApiRequestError ? err.message : 'ذخیره هدف انجام نشد.');
    } finally {
      setSavingTarget(false);
    }
  }

  return (
    <div className="profile-stack">
      <section className="surface-card profile-hero">
        <div>
          <h1 className="profile-hero-title">هر نذر کوچک، یک چراغ روشن‌تر.</h1>
          <p className="profile-muted">خلاصه همراهی، پرداخت‌ها و مسیر شخصی شما در این پنل جمع شده است.</p>
        </div>
        <Link className="btn-primary" href="/nazr/new">
          مشارکت دوباره
        </Link>
      </section>

      <section className="surface-card">
        <div className="profile-stat-grid">
          <StatCard label="تعداد مشارکت" value={String(summary.contributions.totalRequests)} />
          <StatCard label="مبلغ مشارکت" value={formatMoney(summary.contributions.totalAmount)} />
          <StatCard label="امتیاز باشگاه" value={summary.club.points.toLocaleString('fa-IR')} />
          <StatCard label="اعلان خوانده‌نشده" value={String(summary.unreadNotifications)} />
        </div>
      </section>

      <section className="surface-card">
        <h2 className="card-title">هدف شخصی من</h2>
        <form className="profile-goal-form" onSubmit={handleTargetSubmit}>
          <textarea
            className="field-input profile-textarea"
            maxLength={500}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="مثلاً امسال در سه طرح نذر شرکت کنم."
            value={target}
          />
          {targetStatus && <p className="profile-muted">{targetStatus}</p>}
          <button className="btn-primary" disabled={savingTarget} type="submit">
            {savingTarget ? 'در حال ذخیره...' : 'ذخیره هدف'}
          </button>
        </form>
      </section>

      <RecentActivities items={recent} />
    </div>
  );
}

function RecentActivities({ items }: { items: NazrRequest[] }) {
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
    <section className="surface-card">
      <h2 className="card-title">فعالیت‌های اخیر</h2>
      {items.length === 0 ? (
        <EmptyState title="هنوز مشارکتی ثبت نشده است" body="بعد از ثبت اولین نذر، فعالیت‌های اخیر اینجا نمایش داده می‌شود." />
      ) : (
        <div className="profile-list">
          {items.map((item) => (
            <div className="profile-list-row" key={item.id}>
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
            </div>
          ))}
          {paymentError && <p className="field-error">{paymentError}</p>}
        </div>
      )}
    </section>
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
    <div className="profile-stack">
      <section className="surface-card">
        <h1 className="card-title">اطلاعات حساب</h1>
        <form className="field-stack" onSubmit={handleSave}>
          <Field label="نام و نام خانوادگی" onChange={setFullName} value={fullName} />
          <Field dir="ltr" label="شماره همراه" onChange={setMobile} value={mobile} />
          <Field dir="ltr" label="شماره ایتا" onChange={setEitaNumber} required={false} value={eitaNumber} />
          <div className="field-group">
            <span className="field-label">پلتفرم‌های فعالیت</span>
            <div className="profile-chip-grid">
              {PLATFORM_OPTIONS.map((option) => (
                <label className="profile-chip" key={option.id}>
                  <input
                    checked={platforms.includes(option.id)}
                    onChange={() => togglePlatform(option.id)}
                    type="checkbox"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          {message && <p className="profile-muted">{message}</p>}
          <button className="btn-primary" disabled={saving} type="submit">
            {saving ? 'در حال ذخیره...' : 'ذخیره اطلاعات'}
          </button>
        </form>
      </section>
      <ChangePasswordCard />
    </div>
  );
}

function ContributionsPanel({ nazrs, summary }: { nazrs: NazrRequest[]; summary: UserProfileSummary }) {
  const maxAmount = Math.max(...summary.contributions.byNazrType.map((item) => item.totalAmount.amount), 1);
  return (
    <div className="profile-stack">
      <section className="surface-card">
        <h1 className="card-title">مشارکت‌ها</h1>
        <div className="profile-progress-list">
          {summary.contributions.byNazrType.length === 0 ? (
            <EmptyState title="هنوز مشارکتی ثبت نشده است" body="با ثبت نذر، سهم شما در هر طرح اینجا دیده می‌شود." />
          ) : (
            summary.contributions.byNazrType.map((item) => (
              <Link className="profile-progress-row" href="/nazr/new" key={item.nazrTypeId}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.count.toLocaleString('fa-IR')} مشارکت · {formatMoney(item.totalAmount)}</span>
                </div>
                <div className="profile-progress-track">
                  <span style={{ inlineSize: `${Math.max(6, (item.totalAmount.amount / maxAmount) * 100)}%` }} />
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
      <RecentActivities items={nazrs} />
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

  return (
    <div className="profile-stack">
      <section className="surface-card">
        <h1 className="card-title">ثبت تیکت</h1>
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
          <button className="btn-primary" type="submit">ارسال تیکت</button>
        </form>
      </section>
      <section className="surface-card">
        <h2 className="card-title">تیکت‌های من</h2>
        <div className="profile-list">
          {!tickets || tickets.items.length === 0 ? (
            <EmptyState title="تیکتی وجود ندارد" body="برای ارتباط با پشتیبانی سایت، از فرم بالا استفاده کنید." />
          ) : (
            tickets.items.map((ticket) => (
              <div className="profile-list-row" key={ticket.id}>
                <div className="profile-list-head">
                  <p className="profile-list-title">{ticket.subject}</p>
                  <span className={ticket.status === 'closed' ? 'badge-neutral' : 'badge-info'}>{ticket.status}</span>
                </div>
                {ticket.messages.map((item) => (
                  <p className="profile-ticket-message" key={item.id}>
                    {item.authorType === 'support' ? 'پشتیبانی' : 'شما'}: {item.body}
                  </p>
                ))}
                {ticket.status !== 'closed' && (
                  <div className="profile-inline-form">
                    <input
                      className="field-input"
                      onChange={(e) => setReplyBody((current) => ({ ...current, [ticket.id]: e.target.value }))}
                      placeholder="پاسخ کوتاه"
                      value={replyBody[ticket.id] ?? ''}
                    />
                    <button className="btn-ghost" onClick={() => handleReply(ticket.id)} type="button">پاسخ</button>
                    <button className="btn-ghost" onClick={() => handleClose(ticket.id)} type="button">بستن</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
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
  const [message, setMessage] = useState('');

  async function loadWallet() {
    const [walletData, transactionData] = await Promise.all([getProfileWallet(), getWalletTransactions()]);
    setWallet(walletData);
    setTransactions(transactionData);
    setMonthlyEnabled(walletData.isMonthlyDeductionEnabled);
    setMonthlyAmount(walletData.monthlyDeductionAmount?.amount ? String(walletData.monthlyDeductionAmount.amount) : '');
  }

  useEffect(() => {
    loadWallet().catch(() => undefined);
  }, []);

  async function handleCharge(e: FormEvent) {
    e.preventDefault();
    await createWalletCharge({ amount: { amount: Number(charge), currency: 'IRT' } });
    setCharge('');
    setMessage('شارژ کیف پول ثبت شد.');
    await loadWallet();
  }

  async function handleSettings(e: FormEvent) {
    e.preventDefault();
    const updated = await updateProfileWallet({
      isMonthlyDeductionEnabled: monthlyEnabled,
      monthlyDeductionAmount: monthlyEnabled
        ? { amount: Number(monthlyAmount), currency: 'IRT' }
        : null,
    });
    setWallet(updated);
    setMessage('تنظیمات کیف پول ذخیره شد.');
  }

  return (
    <div className="profile-stack">
      <section className="surface-card">
        <h1 className="card-title">کیف پول</h1>
        <div className="profile-stat-grid">
          <StatCard label="موجودی" value={wallet ? formatMoney(wallet.balance) : '۰ تومان'} />
          <StatCard label="برداشت ماهانه" value={monthlyEnabled ? 'فعال' : 'غیرفعال'} />
        </div>
      </section>
      <section className="surface-card">
        <h2 className="card-title">شارژ و تنظیمات</h2>
        <form className="profile-wallet-grid" onSubmit={handleCharge}>
          <Field label="مبلغ شارژ" onChange={setCharge} type="number" value={charge} />
          <button className="btn-primary" type="submit">ثبت شارژ</button>
        </form>
        <form className="profile-wallet-grid" onSubmit={handleSettings}>
          <label className="profile-chip">
            <input checked={monthlyEnabled} onChange={(e) => setMonthlyEnabled(e.target.checked)} type="checkbox" />
            <span>برداشت ماهانه فعال باشد</span>
          </label>
          <Field label="مبلغ برداشت ماهانه" onChange={setMonthlyAmount} required={monthlyEnabled} type="number" value={monthlyAmount} />
          <button className="btn-ghost" type="submit">ذخیره تنظیمات</button>
        </form>
        {message && <p className="profile-muted">{message}</p>}
      </section>
      <section className="surface-card">
        <h2 className="card-title">تراکنش‌های کیف پول</h2>
        <div className="profile-list">
          {transactions.length === 0 ? (
            <EmptyState title="تراکنشی وجود ندارد" body="شارژها و برداشت‌های کیف پول اینجا نمایش داده می‌شوند." />
          ) : (
            transactions.map((item) => (
              <div className="profile-list-row" key={item.id}>
                <div className="profile-list-head">
                  <p className="profile-list-title">{item.description}</p>
                  <span className="badge-info">{item.type}</span>
                </div>
                <div className="profile-list-info">
                  <ProfileRecentInfo label="مبلغ" value={formatMoney(item.amount)} />
                  <ProfileRecentInfo label="تاریخ" value={formatDate(item.createdAt)} />
                </div>
              </div>
            ))
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

  async function loadCards() {
    setCards(await getInvitationCards());
  }

  useEffect(() => {
    loadCards().catch(() => setCards([]));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await createInvitationCard({ friendName, friendMobile: friendMobile || null });
    setFriendName('');
    setFriendMobile('');
    await loadCards();
  }

  return (
    <div className="profile-stack">
      <section className="surface-card">
        <h1 className="card-title">کارت دعوت</h1>
        <form className="field-stack" onSubmit={handleCreate}>
          <Field label="نام دوست" onChange={setFriendName} value={friendName} />
          <Field dir="ltr" label="شماره همراه دوست" onChange={setFriendMobile} required={false} value={friendMobile} />
          <button className="btn-primary" type="submit">ساخت کارت دعوت</button>
        </form>
      </section>
      <section className="surface-card">
        <h2 className="card-title">دعوت‌نامه‌های ساخته‌شده</h2>
        <div className="profile-list">
          {cards.length === 0 ? (
            <EmptyState title="هنوز کارت دعوتی ساخته نشده است" body="با وارد کردن نام دوست، متن دعوت آماده دریافت می‌شود." />
          ) : (
            cards.map((card) => (
              <div className="profile-list-row" key={card.id}>
                <p className="profile-list-title">{card.friendName}</p>
                <p className="profile-muted">{card.downloadText}</p>
                <a
                  className="profile-pay-link"
                  download={`nazr-invite-${card.friendName}.txt`}
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(card.downloadText)}`}
                >
                  دریافت متن دعوت
                </a>
              </div>
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
    <section className="surface-card">
      <h2 className="card-title">گذرواژه</h2>
      <form className="field-stack" onSubmit={handleSubmit}>
        <Field autoComplete="current-password" label="گذرواژه فعلی" onChange={setCurrentPassword} type="password" value={currentPassword} />
        <Field autoComplete="new-password" label="گذرواژه جدید" onChange={setNewPassword} type="password" value={newPassword} />
        <Field autoComplete="new-password" label="تکرار گذرواژه جدید" onChange={setConfirmPassword} type="password" value={confirmPassword} />
        {message && <p className="profile-muted">{message}</p>}
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
  dir,
  label,
  onChange,
  required = true,
  type = 'text',
  value,
}: {
  autoComplete?: string;
  dir?: 'ltr' | 'rtl';
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="field-group">
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

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="profile-empty">
      <p className="profile-empty-title">{title}</p>
      <p className="profile-muted">{body}</p>
    </div>
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
