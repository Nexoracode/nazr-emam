'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { isValidIranMobile, normalizeIranMobile } from '@nazr-emam/shared';
import { ApiRequestError, requestOtp, verifyOtp } from '../../../lib/api';

type Step = 'phone' | 'otp';
const OTP_DURATION = 5 * 60;

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const fieldCls = (err: boolean) =>
  `h-11 w-full min-w-0 rounded-lg border bg-auth-input-dark px-3 text-[13px] text-auth-text outline-none transition placeholder:text-auth-muted focus:border-auth-accent focus:ring-2 focus:ring-auth-accent/25 ${
    err
      ? 'border-danger focus:border-danger focus:ring-danger/20'
      : 'border-auth-input-border'
  }`;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error' | ''>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (otpSeconds <= 0) return;
    const id = setInterval(() => setOtpSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [otpSeconds]);

  function validateMobile(): string | null {
    const n = normalizeIranMobile(mobile);
    if (!n) return 'شماره همراه الزامی است.';
    if (!n.startsWith('09')) return 'شماره همراه باید با ۰۹ شروع شود.';
    if (n.length !== 11) return 'شماره همراه باید ۱۱ رقم باشد.';
    if (!isValidIranMobile(n)) return 'پیش‌شماره همراه معتبر نیست.';
    return null;
  }

  async function sendOtp() {
    setMessage('');
    setMessageTone('');
    setFieldErrors({});
    const err = validateMobile();
    if (err) { setFieldErrors({ mobile: err }); return; }
    setIsSubmitting(true);
    try {
      await requestOtp({ mobile: normalizeIranMobile(mobile) });
      setStep('otp');
      setOtpSeconds(OTP_DURATION);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setMessage(e.message);
        setMessageTone('error');
      } else {
        setMessage('درخواست انجام نشد. دوباره تلاش کنید.');
        setMessageTone('error');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setMessageTone('');
    setFieldErrors({});
    if (!otp || otp.length < 4) { setFieldErrors({ otp: 'کد تایید الزامی است.' }); return; }
    setIsSubmitting(true);
    try {
      await verifyOtp({ mobile: normalizeIranMobile(mobile), code: otp });
      setMessage('ورود با موفقیت انجام شد.');
      setMessageTone('success');
      window.setTimeout(() => { router.push('/'); router.refresh(); }, 900);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setMessage(e.message);
        setMessageTone('error');
        setFieldErrors(e.fields ?? {});
      } else {
        setMessage('درخواست انجام نشد. دوباره تلاش کنید.');
        setMessageTone('error');
      }
    } finally {
      setIsSubmitting(false);
    }
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
            {step === 'phone'
              ? 'شماره همراه خود را وارد کنید تا کد تایید ارسال شود.'
              : 'کد ارسال‌شده به شماره همراه را وارد کنید.'}
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
              {fieldErrors.mobile && (
                <small className="text-[10px] text-danger">{fieldErrors.mobile}</small>
              )}
            </label>

            {message && (
              <p
                aria-live="polite"
                className={`m-0 rounded-md border px-3 py-2 text-right text-[11px] leading-5 ${
                  messageTone === 'success'
                    ? 'border-auth-accent/40 bg-auth-accent/10 text-auth-accent'
                    : 'border-danger/45 bg-danger/10 text-danger'
                }`}
              >
                {message}
              </p>
            )}

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
                className={fieldCls(Boolean(fieldErrors.otp))}
                dir="ltr"
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="------"
                type="text"
                value={otp}
              />
              {fieldErrors.otp && (
                <small className="text-[10px] text-danger">{fieldErrors.otp}</small>
              )}
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
              <button
                className="cursor-pointer"
                onClick={() => { setStep('phone'); setOtp(''); setMessage(''); setMessageTone(''); }}
                style={{ color: '#65b5ff' }}
                type="button"
              >
                بازگشت
              </button>
            </div>

            {message && (
              <p
                aria-live="polite"
                className={`m-0 rounded-md border px-3 py-2 text-right text-[11px] leading-5 ${
                  messageTone === 'success'
                    ? 'border-auth-accent/40 bg-auth-accent/10 text-auth-accent'
                    : 'border-danger/45 bg-danger/10 text-danger'
                }`}
              >
                {message}
              </p>
            )}

            <button
              className="h-10 w-full cursor-pointer rounded-lg bg-auth-accent text-[13px] font-extrabold text-foreground shadow-auth-action transition hover:bg-auth-accent-dark disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'در حال بررسی...' : 'ورود به حساب'}
            </button>
          </form>
        )}

        <div className="mt-5 border-t border-auth-card-border pt-4 text-center">
          <Link
            className="text-[11px] transition"
            href="/auth/login"
            style={{ color: '#65b5ff' }}
          >
            بازگشت به صفحه ورود
          </Link>
        </div>
      </section>
    </main>
  );
}
