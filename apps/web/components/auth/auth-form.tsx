'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { isValidIranMobile, normalizeIranMobile } from '@nazr-emam/shared';
import { ApiRequestError, login, register, requestOtp, verifyOtp } from '../../lib/api';

type AuthMode = 'login' | 'register';
type LoginStep = 'phone' | 'otp' | 'password';
type FieldErrors = Record<string, string>;

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
  const n = normalizeIranMobile(mobile);
  if (!n) return 'شماره همراه الزامی است.';
  if (!/^\d+$/.test(n)) return 'شماره همراه فقط باید شامل عدد باشد.';
  if (!n.startsWith('09')) return 'شماره همراه باید با ۰۹ شروع شود.';
  if (n.length !== 11) return 'شماره همراه باید ۱۱ رقم باشد.';
  if (!isValidIranMobile(n)) return 'پیش‌شماره همراه معتبر نیست.';
  return null;
}

function handleApiError(
  e: unknown,
  setMessage: (m: string) => void,
  setMessageTone: (t: 'error') => void,
  setFieldErrors: (f: FieldErrors) => void,
) {
  if (e instanceof ApiRequestError) {
    setMessage(e.message);
    setMessageTone('error');
    setFieldErrors(e.fields ?? {});
  } else {
    setMessage('درخواست انجام نشد. لطفا دوباره تلاش کنید.');
    setMessageTone('error');
  }
}

function getSafeRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/auth')) {
    return '/';
  }

  return value;
}

function getAuthHref(path: '/auth/login' | '/auth/register', redirectTo: string): string {
  if (redirectTo === '/') return path;
  return `${path}?redirect=${encodeURIComponent(redirectTo)}`;
}

function useAuthRedirect(initialRedirect = '/') {
  const [redirectTo, setRedirectTo] = useState(getSafeRedirect(initialRedirect));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectTo(getSafeRedirect(params.get('redirect') ?? initialRedirect));
  }, [initialRedirect]);

  return redirectTo;
}

export function AuthForm({
  mode,
  initialRedirect,
}: {
  mode: AuthMode;
  initialRedirect?: string;
}) {
  if (mode === 'login') return <LoginForm initialRedirect={initialRedirect} />;
  return <RegisterForm initialRedirect={initialRedirect} />;
}

// ─── Login (multi-step) ───────────────────────────────────────────────────────

function LoginForm({ initialRedirect }: { initialRedirect?: string }) {
  const router = useRouter();
  const redirectTo = useAuthRedirect(initialRedirect);
  const [step, setStep] = useState<LoginStep>('phone');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [remember, setRemember] = useState(false);
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error' | ''>('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const remembered = window.localStorage.getItem('nazr-emam-mobile');
    if (remembered) setMobile(remembered);
  }, []);

  useEffect(() => {
    if (otpSeconds <= 0) return;
    const id = setInterval(() => setOtpSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [otpSeconds]);

  function clearMessages() {
    setMessage('');
    setMessageTone('');
    setFieldErrors({});
  }

  function goBack() {
    clearMessages();
    setOtp('');
    setPassword('');
    setStep('phone');
  }

  async function handleSendOtp() {
    clearMessages();
    const err = validateMobile(mobile);
    if (err) { setFieldErrors({ mobile: err }); return; }
    setIsSubmitting(true);
    try {
      await requestOtp({ mobile: normalizeIranMobile(mobile) });
      setStep('otp');
      setOtpSeconds(OTP_DURATION);
    } catch (e) {
      handleApiError(e, setMessage, setMessageTone, setFieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoToPassword() {
    clearMessages();
    const err = validateMobile(mobile);
    if (err) { setFieldErrors({ mobile: err }); return; }
    setStep('password');
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    clearMessages();
    if (!otp || otp.length < 4) { setFieldErrors({ otp: 'کد تایید الزامی است.' }); return; }
    setIsSubmitting(true);
    try {
      await verifyOtp({ mobile: normalizeIranMobile(mobile), code: otp });
      setMessage('ورود با موفقیت انجام شد.');
      setMessageTone('success');
      window.setTimeout(() => { router.push(redirectTo); router.refresh(); }, 900);
    } catch (e) {
      handleApiError(e, setMessage, setMessageTone, setFieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    clearMessages();
    if (!password) { setFieldErrors({ password: 'رمز عبور الزامی است.' }); return; }
    setIsSubmitting(true);
    try {
      await login({ mobile: normalizeIranMobile(mobile), password });
      if (remember) window.localStorage.setItem('nazr-emam-mobile', normalizeIranMobile(mobile));
      else window.localStorage.removeItem('nazr-emam-mobile');
      setMessage('ورود با موفقیت انجام شد.');
      setMessageTone('success');
      window.setTimeout(() => { router.push(redirectTo); router.refresh(); }, 900);
    } catch (e) {
      handleApiError(e, setMessage, setMessageTone, setFieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-6 flex flex-col items-center text-center">
        <RobotLogo />
        <h1 className="mb-1 mt-4 text-[18px] font-extrabold text-auth-text">خوش آمدید!</h1>
        <p className="m-0 text-[11px] leading-5 text-auth-muted">
          برای ورود به حساب خود، اطلاعات را وارد کنید
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

          {message && <MessageBox tone={messageTone}>{message}</MessageBox>}

          <div className="grid grid-cols-2 gap-3">
            <button
              className="h-10 cursor-pointer rounded-lg border border-auth-input-border bg-transparent text-[11px] font-semibold text-auth-text transition hover:border-auth-accent hover:text-auth-accent disabled:opacity-60"
              disabled={isSubmitting}
              onClick={handleSendOtp}
              type="button"
            >
              {isSubmitting ? '...' : 'ورود با کد یکبار مصرف'}
            </button>
            <button
              className="h-10 cursor-pointer rounded-lg bg-auth-accent text-[11px] font-semibold text-auth-btn-text shadow-auth-action transition hover:bg-auth-accent-dark disabled:opacity-60"
              disabled={isSubmitting}
              onClick={handleGoToPassword}
              type="button"
            >
              ورود با رمز عبور
            </button>
          </div>
        </div>
      )}

      {step === 'otp' && (
        <form className="grid gap-4" onSubmit={handleOtpSubmit} noValidate>
          <label className="grid gap-1.5 text-right text-[11px] font-bold text-auth-text">
            <span>کد تایید پیامکی</span>
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
                onClick={handleSendOtp}
                type="button"
              >
                ارسال مجدد
              </button>
            )}
            <button
              className="cursor-pointer text-auth-link"
              onClick={goBack}
              style={{ color: '#65b5ff' }}
              type="button"
            >
              بازگشت
            </button>
          </div>

          {message && <MessageBox tone={messageTone}>{message}</MessageBox>}

          <button
            className="h-10 w-full cursor-pointer rounded-lg bg-auth-accent text-[12px] font-semibold text-auth-btn-text shadow-auth-action transition hover:bg-auth-accent-dark disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'در حال بررسی...' : 'ورود'}
          </button>
        </form>
      )}

      {step === 'password' && (
        <form className="grid gap-4" onSubmit={handlePasswordSubmit} noValidate>
          <PasswordField
            autoComplete="current-password"
            error={fieldErrors.password}
            label="رمز عبور"
            onChange={setPassword}
            value={password}
          />

          <div className="flex items-center justify-between text-[11px]">
            <label className="flex cursor-pointer items-center gap-1.5 text-auth-text">
              <input
                checked={remember}
                className="h-3.5 w-3.5 accent-auth-accent"
                onChange={(e) => setRemember(e.target.checked)}
                type="checkbox"
              />
              <span>مرا به خاطر بسپار</span>
            </label>
            <Link
              className="transition"
              href="/auth/forgot-password"
              style={{ color: '#65b5ff' }}
            >
              رمز عبور را فراموش کردید؟
            </Link>
          </div>

          {message && <MessageBox tone={messageTone}>{message}</MessageBox>}

          <button
            className="h-10 w-full cursor-pointer rounded-lg bg-auth-accent text-[12px] font-semibold text-auth-btn-text shadow-auth-action transition hover:bg-auth-accent-dark disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'در حال ورود...' : 'ورود به حساب'}
          </button>

          <button
            className="text-center text-[11px] transition"
            onClick={goBack}
            style={{ color: '#65b5ff' }}
            type="button"
          >
            بازگشت
          </button>
        </form>
      )}

      <div className="mt-5 border-t border-auth-card-border pt-4 text-center">
        <p className="m-0 text-[11px] leading-5 text-auth-muted">هنوز حساب کاربری ندارید؟</p>
        <Link
          className="mt-2 flex h-9 items-center justify-center rounded-md border border-auth-link-border bg-auth-link-surface text-[12px] font-bold transition"
          href={getAuthHref('/auth/register', redirectTo)}
          style={{ color: '#c8d8e8' }}
        >
          ساخت حساب جدید
        </Link>
      </div>

      <Link
        className="mt-4 block text-center text-[11px] text-auth-muted transition hover:text-auth-text"
        href="/"
      >
        خانه
      </Link>
    </AuthShell>
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────

function RegisterForm({ initialRedirect }: { initialRedirect?: string }) {
  const router = useRouter();
  const redirectTo = useAuthRedirect(initialRedirect);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error' | ''>('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setMessageTone('');
    setFieldErrors({});

    const errors: FieldErrors = {};
    if (!fullName.trim() || fullName.trim().length < 2)
      errors.fullName = 'نام و نام خانوادگی باید حداقل ۲ کاراکتر باشد.';
    const mobileErr = validateMobile(mobile);
    if (mobileErr) errors.mobile = mobileErr;
    if (!password) errors.password = 'رمز عبور الزامی است.';
    else if (!passwordPattern.test(password))
      errors.password = 'رمز عبور باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد.';
    if (!confirmPassword) errors.confirmPassword = 'تکرار رمز عبور الزامی است.';
    else if (password !== confirmPassword)
      errors.confirmPassword = 'رمز عبور و تکرار آن یکسان نیستند.';
    if (!acceptedTerms) errors.terms = 'پذیرش قوانین الزامی است.';

    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setIsSubmitting(true);
    try {
      await register({
        fullName: fullName.trim(),
        mobile: normalizeIranMobile(mobile),
        password,
      });
      setMessage('حساب کاربری شما ساخته شد. در حال بازگشت به ادامه مسیر...');
      setMessageTone('success');
      window.setTimeout(() => { router.push(redirectTo); router.refresh(); }, 900);
    } catch (e) {
      handleApiError(e, setMessage, setMessageTone, setFieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-5 flex flex-col items-center text-center">
        <RobotLogo />
        <h1 className="mb-1 mt-4 text-[16px] font-extrabold text-auth-text">
          عضویت در نذر امام
        </h1>
        <p className="m-0 text-[11px] leading-5 text-auth-muted">
          حساب کاربری خود را بسازید و نذرهای ثبت‌شده را پیگیری کنید
        </p>
      </div>

      <form className="grid gap-3.5" onSubmit={handleSubmit} noValidate>
        <label className="grid gap-1.5 text-right text-[11px] font-bold text-auth-text">
          <span>نام و نام خانوادگی</span>
          <input
            autoComplete="name"
            className={fieldCls(Boolean(fieldErrors.fullName))}
            dir="rtl"
            maxLength={60}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="مثلاً: علی رضایی"
            type="text"
            value={fullName}
          />
          {fieldErrors.fullName && (
            <small className="text-[10px] text-danger">{fieldErrors.fullName}</small>
          )}
        </label>

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

        <div className="grid grid-cols-2 gap-3">
          <PasswordField
            autoComplete="new-password"
            error={fieldErrors.password}
            label="رمز عبور"
            onChange={setPassword}
            value={password}
          />
          <PasswordField
            autoComplete="new-password"
            error={fieldErrors.confirmPassword}
            label="تکرار رمز"
            onChange={setConfirmPassword}
            value={confirmPassword}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-auth-text">
          <input
            checked={acceptedTerms}
            className="h-3.5 w-3.5 accent-auth-accent"
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            type="checkbox"
          />
          <span>قوانین و شرایط استفاده را می‌پذیرم</span>
        </label>
        {fieldErrors.terms && (
          <small className="-mt-2 text-[10px] text-danger">{fieldErrors.terms}</small>
        )}

        {message && <MessageBox tone={messageTone}>{message}</MessageBox>}

        <button
          className="h-10 w-full cursor-pointer rounded-lg bg-auth-accent text-[12px] font-semibold text-auth-btn-text shadow-auth-action transition hover:bg-auth-accent-dark disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'در حال ارسال...' : 'ثبت نام'}
        </button>
      </form>

      <div className="mt-4 border-t border-auth-card-border pt-3 text-center">
        <p className="m-0 text-[11px] leading-5 text-auth-muted">قبلاً ثبت نام کرده‌اید؟</p>
        <Link
          className="mt-2 flex h-9 items-center justify-center rounded-md border border-auth-link-border bg-auth-link-surface text-[12px] font-bold transition"
          href={getAuthHref('/auth/login', redirectTo)}
          style={{ color: '#c8d8e8' }}
        >
          ورود به حساب
        </Link>
      </div>

      <Link
        className="mt-4 block text-center text-[11px] text-auth-muted transition hover:text-auth-text"
        href="/"
      >
        خانه
      </Link>
    </AuthShell>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      dir="rtl"
      className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_center,var(--color-auth-bg-start)_0%,var(--color-auth-bg)_50%,var(--color-auth-bg-end)_100%)] px-4 py-8 text-auth-text"
    >
      <section className="w-full max-w-[420px] rounded-[14px] border border-auth-card-border bg-auth-card px-[18px] pb-6 pt-7 shadow-auth-dark sm:px-6">
        {children}
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

function PasswordField({
  autoComplete,
  error,
  label,
  onChange,
  value,
}: {
  autoComplete: string;
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
          autoComplete={autoComplete}
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

function RobotLogo() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="44"
      viewBox="0 0 44 44"
      width="44"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="9" y="11" width="26" height="20" rx="3" fill="#ffb703" />
      <rect x="14" y="16" width="5" height="5" rx="1" fill="#141b21" />
      <rect x="25" y="16" width="5" height="5" rx="1" fill="#141b21" />
      <rect x="16" y="24" width="12" height="3" rx="1.5" fill="#141b21" />
      <rect x="19" y="5" width="6" height="6" rx="3" fill="#ffb703" />
      <rect x="21" y="8" width="2" height="3" fill="#ffb703" />
      <rect x="3" y="16" width="6" height="9" rx="3" fill="#ffb703" />
      <rect x="35" y="16" width="6" height="9" rx="3" fill="#ffb703" />
      <rect x="13" y="31" width="6" height="8" rx="3" fill="#ffb703" />
      <rect x="25" y="31" width="6" height="8" rx="3" fill="#ffb703" />
    </svg>
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
