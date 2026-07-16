'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { isValidIranMobile, normalizeIranMobile } from '@nazr-emam/shared';
import { ApiRequestError, requestOtp, resetPassword } from '../../../lib/api';

type Step = 'phone' | 'otp' | 'password';
type MessageTone = 'success' | 'error' | '';

const OTP_DURATION = 5 * 60;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const fieldCls = (err: boolean) =>
  `h-11 w-full min-w-0 rounded-lg border bg-auth-input-dark px-3 text-[13px] text-auth-text outline-none transition placeholder:text-auth-muted focus:border-auth-accent focus:ring-2 focus:ring-auth-accent/25 ${
    err
      ? 'border-danger focus:border-danger focus:ring-danger/20'
      : 'border-auth-input-border'
  }`;

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function validateMobile(mobile: string): string | null {
  const normalized = normalizeIranMobile(mobile);
  if (!normalized) return 'شماره همراه الزامی است.';
  if (!normalized.startsWith('09')) return 'شماره همراه باید با ۰۹ شروع شود.';
  if (normalized.length !== 11) return 'شماره همراه باید ۱۱ رقم باشد.';
  if (!isValidIranMobile(normalized)) return 'پیش‌شماره همراه معتبر نیست.';
  return null;
}

function MessageBox({ children, tone }: { children: React.ReactNode; tone: MessageTone }) {
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

function PasswordField({
  error,
  label,
  onChange,
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="grid gap-1.5 text-right text-[11px] font-bold text-auth-text">
      <span>{label}</span>
      <span className="relative block">
        <input
          autoComplete="new-password"
          className={`${fieldCls(Boolean(error))} pl-10`}
          dir="ltr"
          minLength={8}
          onChange={(e) => onChange(e.target.value)}
          type={visible ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={visible ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
          className="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-auth-muted transition hover:bg-auth-link-surface hover:text-auth-text"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
      {error && <small className="text-[10px] text-danger">{error}</small>}
    </label>
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageTone>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (otpSeconds <= 0) return;
    const id = setInterval(() => setOtpSeconds((seconds) => seconds - 1), 1000);
    return () => clearInterval(id);
  }, [otpSeconds]);

  function clearMessages() {
    setMessage('');
    setMessageTone('');
    setFieldErrors({});
  }

  async function sendOtp() {
    clearMessages();
    const mobileError = validateMobile(mobile);
    if (mobileError) {
      setFieldErrors({ mobile: mobileError });
      return;
    }

    setIsSubmitting(true);
    try {
      await requestOtp({ mobile: normalizeIranMobile(mobile) });
      setStep('otp');
      setOtpSeconds(OTP_DURATION);
      setMessage('کد تایید برای شماره همراه شما ارسال شد.');
      setMessageTone('success');
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setMessage(error.message);
        setFieldErrors(error.fields ?? {});
      } else {
        setMessage('درخواست ارسال کد انجام نشد. دوباره تلاش کنید.');
      }
      setMessageTone('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    clearMessages();
    if (!otp || otp.length < 4) {
      setFieldErrors({ code: 'کد تایید الزامی است.' });
      return;
    }
    setStep('password');
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    clearMessages();

    const errors: Record<string, string> = {};
    if (!newPassword) errors.newPassword = 'رمز عبور جدید الزامی است.';
    else if (!passwordPattern.test(newPassword)) {
      errors.newPassword = 'رمز عبور باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد.';
    }
    if (!confirmPassword) errors.confirmPassword = 'تکرار رمز عبور الزامی است.';
    else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'رمز عبور و تکرار آن یکسان نیستند.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({
        mobile: normalizeIranMobile(mobile),
        code: otp,
        newPassword,
      });
      setMessage('رمز عبور با موفقیت تغییر کرد. دوباره وارد حساب شوید.');
      setMessageTone('success');
      window.setTimeout(() => {
        router.push('/auth/login');
        router.refresh();
      }, 900);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setMessage(error.message);
        setFieldErrors(error.fields ?? {});
        if (error.code === 'INVALID_OTP') setStep('otp');
      } else {
        setMessage('تغییر رمز عبور انجام نشد. دوباره تلاش کنید.');
      }
      setMessageTone('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function goBack() {
    clearMessages();
    if (step === 'password') {
      setStep('otp');
      return;
    }
    setStep('phone');
    setOtp('');
  }

  return (
    <main
      dir="rtl"
      className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_center,var(--color-auth-bg-start)_0%,var(--color-auth-bg)_50%,var(--color-auth-bg-end)_100%)] px-4 py-8 text-auth-text"
    >
      <section className="w-full max-w-[420px] rounded-[14px] border border-auth-card-border bg-auth-card px-[18px] pb-6 pt-7 shadow-auth-dark sm:px-6">
        <div className="mb-6 text-center">
          <h1 className="mb-1 text-[17px] font-extrabold text-auth-text">فراموشی رمز عبور</h1>
          <p className="m-0 text-[11px] leading-5 text-auth-muted">
            {step === 'phone' && 'شماره همراه خود را وارد کنید تا کد تایید ارسال شود.'}
            {step === 'otp' && 'کد تایید ارسال‌شده را وارد کنید.'}
            {step === 'password' && 'رمز عبور جدید و تکرار آن را وارد کنید.'}
          </p>
        </div>

        {step === 'phone' && (
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-right text-[11px] font-bold text-auth-text">
              <span>شماره همراه</span>
              <input
                autoComplete="tel"
                className={fieldCls(Boolean(fieldErrors.mobile))}
                dir="ltr"
                inputMode="tel"
                maxLength={11}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="09123456789"
                type="tel"
                value={mobile}
              />
              {fieldErrors.mobile && <small className="text-[10px] text-danger">{fieldErrors.mobile}</small>}
            </label>

            {message && <MessageBox tone={messageTone}>{message}</MessageBox>}

            <button
              className="h-10 w-full cursor-pointer rounded-lg bg-auth-accent text-[13px] font-extrabold text-foreground shadow-auth-action transition hover:bg-auth-accent-dark disabled:opacity-70"
              disabled={isSubmitting}
              onClick={sendOtp}
              type="button"
            >
              {isSubmitting ? 'در حال ارسال...' : 'ارسال کد تایید'}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <form className="grid gap-4" onSubmit={handleOtpSubmit} noValidate>
            <label className="grid gap-1.5 text-right text-[11px] font-bold text-auth-text">
              <span>کد تایید</span>
              <input
                autoComplete="one-time-code"
                className={fieldCls(Boolean(fieldErrors.code))}
                dir="ltr"
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="------"
                type="text"
                value={otp}
              />
              {fieldErrors.code && <small className="text-[10px] text-danger">{fieldErrors.code}</small>}
            </label>

            <div className="flex items-center justify-between text-[11px]">
              {otpSeconds > 0 ? (
                <span className="text-auth-muted">اعتبار کد: {formatTime(otpSeconds)}</span>
              ) : (
                <button
                  className="cursor-pointer text-auth-accent hover:text-auth-accent-dark"
                  disabled={isSubmitting}
                  onClick={sendOtp}
                  type="button"
                >
                  ارسال مجدد
                </button>
              )}
              <button className="cursor-pointer" onClick={goBack} style={{ color: '#65b5ff' }} type="button">
                بازگشت
              </button>
            </div>

            {message && <MessageBox tone={messageTone}>{message}</MessageBox>}

            <button
              className="h-10 w-full cursor-pointer rounded-lg bg-auth-accent text-[13px] font-extrabold text-foreground shadow-auth-action transition hover:bg-auth-accent-dark disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              ادامه
            </button>
          </form>
        )}

        {step === 'password' && (
          <form className="grid gap-4" onSubmit={handlePasswordSubmit} noValidate>
            <PasswordField
              error={fieldErrors.newPassword}
              label="رمز عبور جدید"
              onChange={setNewPassword}
              value={newPassword}
            />

            <PasswordField
              error={fieldErrors.confirmPassword}
              label="تکرار رمز عبور"
              onChange={setConfirmPassword}
              value={confirmPassword}
            />

            {message && <MessageBox tone={messageTone}>{message}</MessageBox>}

            <button
              className="h-10 w-full cursor-pointer rounded-lg bg-auth-accent text-[13px] font-extrabold text-foreground shadow-auth-action transition hover:bg-auth-accent-dark disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'در حال ذخیره...' : 'ثبت رمز عبور جدید'}
            </button>

            <button className="text-center text-[11px]" onClick={goBack} style={{ color: '#65b5ff' }} type="button">
              بازگشت
            </button>
          </form>
        )}

        <div className="mt-5 border-t border-auth-card-border pt-4 text-center">
          <Link className="text-[11px] transition" href="/auth/login" style={{ color: '#65b5ff' }}>
            بازگشت به صفحه ورود
          </Link>
        </div>
      </section>
    </main>
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
