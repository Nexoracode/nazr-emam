'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@nazr-emam/shared';
import { ApiRequestError, getMe, updateProfile, changePassword } from '../../lib/api';

export function ProfileView() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => router.replace('/auth/login'))
      .finally(() => setLoading(false));
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
    <main className="page-shell" style={{ maxWidth: 640 }}>
      <UserInfoCard user={user} onUpdate={setUser} />
      <ChangePasswordCard />
    </main>
  );
}

/* ── کارت اطلاعات کاربر ── */
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
      <h2 className="card-title">اطلاعات حساب</h2>

      <dl className="info-list">
        <div className="info-row">
          <dt className="info-label">شماره همراه</dt>
          <dd className="info-value" dir="ltr">{user.mobile}</dd>
        </div>

        <div className="info-row">
          <dt className="info-label">نام کامل</dt>
          <dd className="info-value">
            {editing ? (
              <input
                className="field-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={60}
                autoFocus
              />
            ) : (
              user.fullName
            )}
          </dd>
        </div>

        <div className="info-row">
          <dt className="info-label">نقش</dt>
          <dd className="info-value">{user.role === 'admin' ? 'مدیر' : 'کاربر'}</dd>
        </div>

        <div className="info-row">
          <dt className="info-label">عضویت از</dt>
          <dd className="info-value">{formatDate(user.createdAt)}</dd>
        </div>
      </dl>

      {error && <p className="field-error">{error}</p>}

      <div className="card-actions">
        {editing ? (
          <>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
            <button className="btn-ghost" onClick={handleCancel} disabled={saving}>
              انصراف
            </button>
          </>
        ) : (
          <button className="btn-ghost" onClick={() => setEditing(true)}>
            ویرایش نام
          </button>
        )}
      </div>
    </section>
  );
}

/* ── کارت تغییر رمز عبور ── */
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
        <div className="field-group">
          <label className="field-label">رمز عبور فعلی</label>
          <input
            type="password"
            className="field-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <div className="field-group">
          <label className="field-label">رمز عبور جدید</label>
          <input
            type="password"
            className="field-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <div className="field-group">
          <label className="field-label">تکرار رمز عبور جدید</label>
          <input
            type="password"
            className="field-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {error && <p className="field-error">{error}</p>}
        {success && <p className="field-success">رمز عبور با موفقیت تغییر کرد</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'در حال ذخیره...' : 'تغییر رمز عبور'}
        </button>
      </form>
    </section>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
