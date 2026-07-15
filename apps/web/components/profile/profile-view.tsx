'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { NazrRequest, NazrRequestStatus, Paginated, User } from '@nazr-emam/shared';
import {
  ApiRequestError,
  changePassword,
  getMe,
  getMyNazrRequests,
  startOnlineNazrPayment,
  updateProfile,
} from '../../lib/api';

type ProfileTab = 'dashboard' | 'edit' | 'tickets' | 'notifications';

const TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: 'dashboard', label: 'داشبورد' },
  { id: 'edit', label: 'ویرایش حساب' },
  { id: 'tickets', label: 'تیکت‌های من' },
  { id: 'notifications', label: 'اعلانات' },
];

const STATUS_LABEL: Record<NazrRequestStatus, string> = {
  draft: 'پیش‌نویس',
  submitted: 'ثبت شده',
  awaiting_payment: 'منتظر پرداخت',
  payment_pending_review: 'در حال بررسی پرداخت',
  confirmed: 'تأیید شده',
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

export function ProfileView() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [nazrs, setNazrs] = useState<Paginated<NazrRequest> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    Promise.all([getMe(), getMyNazrRequests(1, 50)])
      .then(([currentUser, userNazrs]) => {
        if (ignore) return;
        setUser(currentUser);
        setNazrs(userNazrs);
      })
      .catch(() => {
        if (!ignore) router.replace('/auth/login?redirect=/profile');
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
        <div className="text-center py-16" style={{ color: 'var(--muted)' }}>در حال بارگذاری...</div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="page-shell profile-page-shell">
      <aside className="profile-sidebar surface-card" aria-label="بخش‌های پروفایل">
        <div>
          <p className="profile-sidebar-title">{user.fullName}</p>
          <p className="profile-sidebar-subtitle" dir="ltr">{user.mobile}</p>
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
        {activeTab === 'dashboard' && <DashboardPanel user={user} nazrs={nazrs} />}
        {activeTab === 'edit' && (
          <div className="profile-stack">
            <UserInfoCard user={user} onUpdate={setUser} />
            <ChangePasswordCard />
          </div>
        )}
        {activeTab === 'tickets' && <TicketsPanel />}
        {activeTab === 'notifications' && <NotificationsPanel />}
      </section>
    </main>
  );
}

function DashboardPanel({
  user,
  nazrs,
}: {
  user: User;
  nazrs: Paginated<NazrRequest> | null;
}) {
  const [paymentError, setPaymentError] = useState('');
  const [startingPaymentId, setStartingPaymentId] = useState<string | null>(null);
  const items = nazrs?.items ?? [];
  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.amount.amount, 0),
    [items],
  );
  const completed = items.filter((item) => item.status === 'completed').length;
  const awaitingPayment = items.filter((item) => item.status === 'awaiting_payment').length;
  const recent = items.slice(0, 3);

  async function handleContinuePayment(requestId: string) {
    setPaymentError('');
    setStartingPaymentId(requestId);
    try {
      const payment = await startOnlineNazrPayment(requestId);
      window.location.href = payment.paymentUrl;
    } catch (e) {
      setPaymentError(e instanceof ApiRequestError ? e.message : 'اتصال به پرداخت انجام نشد. دوباره تلاش کنید.');
      setStartingPaymentId(null);
    }
  }

  return (
    <div className="profile-stack">
      <section className="surface-card">
        <div className="profile-section-heading">
          <div>
            <h1 className="card-title">داشبورد</h1>
            <p className="profile-muted">خلاصه حساب و فعالیت‌های شما</p>
          </div>
          <Link className="btn-primary" href="/nazr/new" style={{ textDecoration: 'none' }}>
            ثبت نذر جدید
          </Link>
        </div>

        <div className="profile-stat-grid">
          <StatCard label="تعداد نذرها" value={String(nazrs?.total ?? 0)} />
          <StatCard label="مبلغ ثبت‌شده" value={`${totalAmount.toLocaleString('fa-IR')} تومان`} />
          <StatCard label="منتظر پرداخت" value={String(awaitingPayment)} />
          <StatCard label="انجام‌شده" value={String(completed)} />
        </div>
      </section>

      <section className="surface-card">
        <h2 className="card-title">فعالیت‌های اخیر</h2>
        {recent.length === 0 ? (
          <EmptyState
            title="هنوز نذری ثبت نشده است"
            body="بعد از ثبت اولین نذر، خلاصه فعالیت‌ها اینجا نمایش داده می‌شود."
          />
        ) : (
          <div className="profile-list">
            {recent.map((item) => (
              <div className="profile-list-row" key={item.id}>
                <div>
                  <p className="profile-list-title">{item.nazrType.title}</p>
                  <p className="profile-muted">
                    {item.amount.amount.toLocaleString('fa-IR')} تومان · {formatDate(item.createdAt)}
                  </p>
                </div>
                <div className="profile-list-actions">
                  <span className={STATUS_COLOR[item.status]}>{STATUS_LABEL[item.status]}</span>
                  {item.status === 'awaiting_payment' && (
                    <button
                      className="profile-pay-link"
                      disabled={startingPaymentId === item.id}
                      onClick={() => handleContinuePayment(item.id)}
                      type="button"
                    >
                      {startingPaymentId === item.id ? 'در حال اتصال...' : 'ادامه پرداخت'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {paymentError && <p className="field-error">{paymentError}</p>}
          </div>
        )}
      </section>

      <section className="surface-card">
        <h2 className="card-title">اطلاعات حساب</h2>
        <dl className="info-list">
          <InfoRow label="نام کامل" value={user.fullName} />
          <InfoRow label="شماره همراه" value={user.mobile} dir="ltr" />
          <InfoRow label="نقش" value={user.role === 'admin' ? 'مدیر' : 'کاربر'} />
          <InfoRow label="عضویت از" value={formatDate(user.createdAt)} />
        </dl>
      </section>
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

function UserInfoCard({ user, onUpdate }: { user: User; onUpdate: (u: User) => void }) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user.fullName);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const updated = await updateProfile({ fullName });
      onUpdate(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'خطایی رخ داد');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setFullName(user.fullName);
    setEditing(false);
    setError('');
  }

  return (
    <section className="surface-card">
      <h2 className="card-title">ویرایش اطلاعات</h2>

      <dl className="info-list">
        <InfoRow label="شماره همراه" value={user.mobile} dir="ltr" />

        <div className="info-row">
          <dt className="info-label">نام کامل</dt>
          <dd className="info-value">
            {editing ? (
              <input
                autoFocus
                className="field-input"
                maxLength={60}
                onChange={(e) => setFullName(e.target.value)}
                value={fullName}
              />
            ) : (
              user.fullName
            )}
          </dd>
        </div>
      </dl>

      {error && <p className="field-error">{error}</p>}

      <div className="card-actions">
        {editing ? (
          <>
            <button className="btn-primary" onClick={handleSave} disabled={saving} type="button">
              {saving ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
            <button className="btn-ghost" onClick={handleCancel} disabled={saving} type="button">
              انصراف
            </button>
          </>
        ) : (
          <button className="btn-ghost" onClick={() => setEditing(true)} type="button">
            ویرایش نام
          </button>
        )}
      </div>
    </section>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('رمز عبور جدید و تکرار آن یکسان نیستند');
      return;
    }
    if (newPassword.length < 8) {
      setError('رمز عبور جدید باید حداقل ۸ کاراکتر باشد');
      return;
    }

    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'خطایی رخ داد');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface-card">
      <h2 className="card-title">تغییر رمز عبور</h2>

      <form onSubmit={handleSubmit} className="field-stack">
        <Field
          autoComplete="current-password"
          label="رمز عبور فعلی"
          onChange={setCurrentPassword}
          type="password"
          value={currentPassword}
        />
        <Field
          autoComplete="new-password"
          label="رمز عبور جدید"
          onChange={setNewPassword}
          type="password"
          value={newPassword}
        />
        <Field
          autoComplete="new-password"
          label="تکرار رمز عبور جدید"
          onChange={setConfirmPassword}
          type="password"
          value={confirmPassword}
        />

        {error && <p className="field-error">{error}</p>}
        {success && <p className="field-success">رمز عبور با موفقیت تغییر کرد</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'در حال ذخیره...' : 'تغییر رمز عبور'}
        </button>
      </form>
    </section>
  );
}

function TicketsPanel() {
  return (
    <section className="surface-card">
      <h1 className="card-title">تیکت‌های من</h1>
      <EmptyState
        title="تیکتی برای نمایش وجود ندارد"
        body="وقتی بخش پشتیبانی فعال شود، تیکت‌ها و پاسخ‌ها اینجا نمایش داده می‌شوند."
      />
    </section>
  );
}

function NotificationsPanel() {
  return (
    <section className="surface-card">
      <h1 className="card-title">اعلانات</h1>
      <EmptyState
        title="اعلان جدیدی ندارید"
        body="پیام‌های مهم حساب و وضعیت نذرها اینجا نمایش داده می‌شوند."
      />
    </section>
  );
}

function Field({
  autoComplete,
  label,
  onChange,
  type,
  value,
}: {
  autoComplete: string;
  label: string;
  onChange: (value: string) => void;
  type: string;
  value: string;
}) {
  return (
    <label className="field-group">
      <span className="field-label">{label}</span>
      <input
        autoComplete={autoComplete}
        className="field-input"
        onChange={(e) => onChange(e.target.value)}
        required
        type={type}
        value={value}
      />
    </label>
  );
}

function InfoRow({ label, value, dir }: { label: string; value: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="info-row">
      <dt className="info-label">{label}</dt>
      <dd className="info-value" dir={dir}>{value}</dd>
    </div>
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
