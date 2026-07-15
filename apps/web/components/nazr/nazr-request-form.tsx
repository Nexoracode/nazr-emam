'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { CreateNazrRequest, NazrType, User } from '@nazr-emam/shared';
import {
  ApiRequestError,
  createNazrRequest,
  getMe,
  getNazrTypes,
} from '../../lib/api';

type FieldErrors = Record<string, string>;

const fieldCls = (err: boolean) =>
  `h-11 w-full min-w-0 rounded-lg border bg-auth-input-dark px-3 text-[13px] text-auth-text outline-none transition placeholder:text-auth-muted focus:border-auth-accent focus:ring-2 focus:ring-auth-accent/25 ${
    err
      ? 'border-danger focus:border-danger focus:ring-danger/20'
      : 'border-auth-input-border'
  }`;

const textAreaCls = (err: boolean) =>
  `min-h-24 w-full min-w-0 resize-y rounded-lg border bg-auth-input-dark px-3 py-2 text-[13px] leading-7 text-auth-text outline-none transition placeholder:text-auth-muted focus:border-auth-accent focus:ring-2 focus:ring-auth-accent/25 ${
    err
      ? 'border-danger focus:border-danger focus:ring-danger/20'
      : 'border-auth-input-border'
  }`;

const selectCls = (err: boolean) =>
  `${fieldCls(err)} appearance-none pl-9`;

function normalizeAmount(value: string) {
  return Number(value.replace(/[,\s]/g, ''));
}

export function NazrRequestForm() {
  const [nazrTypes, setNazrTypes] = useState<NazrType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [donorNationalCode, setDonorNationalCode] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error' | ''>('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let ignore = false;
    setLoadingTypes(true);
    getNazrTypes()
      .then((items) => {
        if (ignore) return;
        setNazrTypes(items);
        setSelectedTypeId((current) => current || items[0]?.id || '');
      })
      .catch(() => {
        if (ignore) return;
        setMessage('دریافت نوع‌های نذر انجام نشد. دوباره تلاش کنید.');
        setMessageTone('error');
      })
      .finally(() => {
        if (!ignore) setLoadingTypes(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoadingUser(true);
    getMe()
      .then((user) => {
        if (ignore) return;
        setCurrentUser(user);
      })
      .catch(() => {
        if (ignore) return;
        setCurrentUser(null);
      })
      .finally(() => {
        if (!ignore) setLoadingUser(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const selectedType = useMemo(
    () => nazrTypes.find((item) => item.id === selectedTypeId) ?? null,
    [nazrTypes, selectedTypeId],
  );
  const accountNoticeClass = loadingUser
    ? 'border-auth-card-border bg-auth-link-surface'
    : currentUser
      ? 'border-[var(--status-ok-color)] bg-[var(--status-ok-bg)]'
      : 'border-auth-accent/60 bg-auth-accent/10';
  const accountNoticeTextClass = loadingUser
    ? 'text-auth-muted'
    : currentUser
      ? 'text-[var(--status-ok-color)]'
      : 'text-auth-text';

  useEffect(() => {
    if (!selectedType?.suggestedAmount || amount) return;
    setAmount(String(selectedType.suggestedAmount.amount));
  }, [amount, selectedType]);

  function resetMessages() {
    setMessage('');
    setMessageTone('');
    setFieldErrors({});
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    resetMessages();

    const errors: FieldErrors = {};
    const normalizedAmount = normalizeAmount(amount);

    if (!selectedTypeId) errors.nazrTypeId = 'انتخاب نوع نذر الزامی است.';
    if (!currentUser) {
      errors.user = 'برای ثبت نذر باید وارد حساب کاربری شوید.';
    }
    if (donorNationalCode.trim() && !/^\d{10}$/.test(donorNationalCode.trim())) {
      errors.donorNationalCode = 'کد ملی باید ۱۰ رقم باشد.';
    }
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      errors.amount = 'مبلغ نذر معتبر نیست.';
    }
    if (note.trim().length > 1000) {
      errors.note = 'یادداشت نباید بیشتر از ۱۰۰۰ کاراکتر باشد.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const payload: CreateNazrRequest = {
      nazrTypeId: selectedTypeId,
      donorNationalCode: donorNationalCode.trim() || null,
      amount: { amount: normalizedAmount, currency: 'IRT' },
      note: note.trim() || null,
      isAnonymous,
    };

    setIsSubmitting(true);
    try {
      await createNazrRequest(payload);
      setMessage('درخواست نذر ثبت شد. بعد از تکمیل پرداخت، کد رهگیری نمایش داده می‌شود.');
      setMessageTone('success');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setMessage(err.message);
        setMessageTone('error');
        setFieldErrors(err.fields ?? {});
      } else {
        setMessage('ثبت نذر انجام نشد. لطفاً دوباره تلاش کنید.');
        setMessageTone('error');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-[calc(100vh-64px)] bg-[radial-gradient(circle_at_center,var(--color-auth-bg-start)_0%,var(--color-auth-bg)_50%,var(--color-auth-bg-end)_100%)] px-4 py-8 text-auth-text"
    >
      <section className="mx-auto w-full max-w-[640px] rounded-[14px] border border-auth-card-border bg-auth-card px-[18px] pb-6 pt-7 shadow-auth-dark sm:px-6">
        <div className="mb-5 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-auth-accent text-[20px] font-black text-auth-btn-text">
            ن
          </div>
          <h1 className="mb-1 mt-4 text-[18px] font-extrabold text-auth-text">
            ثبت نذر
          </h1>
          <p className="m-0 text-[11px] leading-5 text-auth-muted">
            نوع نذر و مبلغ را وارد کنید. کد رهگیری بعد از تکمیل پرداخت نمایش داده می‌شود.
          </p>
        </div>

        <form className="grid gap-3.5" onSubmit={handleSubmit} noValidate>
          <label className="grid gap-1.5 text-right text-[11px] font-bold text-auth-text">
            <span>نوع نذر</span>
            <span className="relative block">
              <select
                className={selectCls(Boolean(fieldErrors.nazrTypeId))}
                disabled={loadingTypes || nazrTypes.length === 0}
                onChange={(e) => setSelectedTypeId(e.target.value)}
                value={selectedTypeId}
              >
                {loadingTypes && <option value="">در حال دریافت...</option>}
                {!loadingTypes && nazrTypes.length === 0 && (
                  <option value="">فعلاً نوع نذر فعالی ثبت نشده است</option>
                )}
                {nazrTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-auth-muted"
              >
                ▾
              </span>
            </span>
            {fieldErrors.nazrTypeId && (
              <small className="text-[10px] text-danger">{fieldErrors.nazrTypeId}</small>
            )}
          </label>

          {selectedType?.description && (
            <p className="m-0 rounded-md border border-auth-card-border bg-auth-link-surface px-3 py-2 text-[11px] leading-6 text-auth-muted">
              {selectedType.description}
            </p>
          )}

          <div className={`rounded-lg border px-3 py-3 ${accountNoticeClass}`}>
            <p className={`m-0 text-[11px] leading-6 ${accountNoticeTextClass}`}>
              {loadingUser ? 'در حال بررسی حساب کاربری...' : null}
              {!loadingUser && currentUser
                ? `این نذر با اطلاعات حساب ${currentUser.fullName} ثبت می‌شود.`
                : null}
              {!loadingUser && !currentUser ? (
                <>
                  برای ثبت نذر باید وارد{' '}
                  <Link
                    className="font-bold text-auth-link underline-offset-4 transition hover:underline"
                    href="/auth/login?redirect=/nazr/new"
                  >
                    حساب کاربری
                  </Link>{' '}
                  شوید.
                </>
              ) : null}
            </p>
            {fieldErrors.user && (
              <small className="mt-2 block text-[10px] text-danger">{fieldErrors.user}</small>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-right text-[11px] font-bold text-auth-text">
              <span>مبلغ نذر به تومان</span>
              <input
                className={fieldCls(Boolean(fieldErrors.amount))}
                dir="ltr"
                inputMode="numeric"
                onChange={(e) => setAmount(e.target.value.replace(/[^\d,\s]/g, ''))}
                placeholder="500000"
                type="text"
                value={amount}
              />
              {fieldErrors.amount && (
                <small className="text-[10px] text-danger">{fieldErrors.amount}</small>
              )}
            </label>

            <label className="grid gap-1.5 text-right text-[11px] font-bold text-auth-text">
              <span>کد ملی اختیاری</span>
              <input
                className={fieldCls(Boolean(fieldErrors.donorNationalCode))}
                dir="rtl"
                inputMode="numeric"
                maxLength={10}
                onChange={(e) => setDonorNationalCode(e.target.value.replace(/\D/g, ''))}
                placeholder="اختیاری"
                type="text"
                value={donorNationalCode}
              />
              {fieldErrors.donorNationalCode && (
                <small className="text-[10px] text-danger">{fieldErrors.donorNationalCode}</small>
              )}
            </label>
          </div>

          <label className="grid gap-1.5 text-right text-[11px] font-bold text-auth-text">
            <span>یادداشت اختیاری</span>
            <textarea
              className={textAreaCls(Boolean(fieldErrors.note))}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="اگر توضیحی برای این نذر دارید بنویسید."
              value={note}
            />
            {fieldErrors.note && (
              <small className="text-[10px] text-danger">{fieldErrors.note}</small>
            )}
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-auth-text">
            <input
              checked={isAnonymous}
              className="h-3.5 w-3.5 accent-auth-accent"
              onChange={(e) => setIsAnonymous(e.target.checked)}
              type="checkbox"
            />
            <span>نام من در گزارش‌های عمومی نمایش داده نشود</span>
          </label>

          {message && <MessageBox tone={messageTone}>{message}</MessageBox>}

          <button
            className="h-10 w-full cursor-pointer rounded-lg bg-auth-accent text-[12px] font-semibold text-auth-btn-text shadow-auth-action transition hover:bg-auth-accent-dark disabled:opacity-70"
            disabled={isSubmitting || loadingTypes || loadingUser || !currentUser || nazrTypes.length === 0}
            type="submit"
          >
            {isSubmitting ? 'در حال ثبت...' : 'ثبت نذر و ادامه پرداخت'}
          </button>
        </form>

        <div className="mt-4 border-t border-auth-card-border pt-3 text-center">
          <Link
            className="text-[11px] text-auth-muted transition hover:text-auth-text"
            href="/"
          >
            بازگشت به خانه
          </Link>
        </div>
      </section>
    </main>
  );
}

function MessageBox({
  tone,
  children,
}: {
  tone: 'success' | 'error' | '';
  children: React.ReactNode;
}) {
  return (
    <p
      aria-live="polite"
      className={`m-0 rounded-md border px-3 py-2 text-right text-[11px] leading-5 ${
        tone === 'success'
          ? 'border-auth-accent/40 bg-auth-accent/10 text-auth-accent'
          : 'border-danger/45 bg-danger/10 text-danger'
      }`}
    >
      {children}
    </p>
  );
}
