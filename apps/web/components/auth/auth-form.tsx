'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { isValidIranMobile, normalizeIranMobile } from '@nazr-emam/shared';
import { ApiRequestError, login, register } from '../../lib/api';

type AuthMode = 'login' | 'register';

interface AuthFormProps {
  mode: AuthMode;
}

type FieldErrors = Record<string, string>;

const defaultError = 'درخواست انجام نشد. لطفا کمی بعد دوباره تلاش کنید.';
const loginFieldClass =
  'h-[46px] w-full min-w-0 rounded-md border border-field-border bg-surface px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15';
const registerFieldBaseClass =
  'h-10 w-full min-w-0 rounded-lg border bg-auth-input-dark px-3 text-[12px] text-auth-text outline-none transition placeholder:text-auth-muted focus:border-auth-accent focus:ring-2 focus:ring-auth-accent/25';

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function getRegisterFieldClass(hasError: boolean) {
  return `${registerFieldBaseClass} ${
    hasError ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-auth-input-border'
  }`;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isLogin = mode === 'login';
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error' | ''>('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const copy = useMemo(
    () => ({
      title: isLogin ? 'فرم ورود' : 'عضویت در نذر امام',
      submit: isLogin ? 'ورود' : 'ثبت نام',
      switchLabel: isLogin ? 'ثبت نام' : 'ورود به حساب',
      switchHref: isLogin ? '/auth/register' : '/auth/login',
      success: isLogin
        ? 'ورود با موفقیت انجام شد.'
        : 'حساب کاربری شما ساخته شد. به صفحه ورود منتقل می‌شوید...',
    }),
    [isLogin],
  );

  useEffect(() => {
    if (!isLogin) {
      return;
    }

    const rememberedMobile = window.localStorage.getItem('nazr-emam-mobile');
    if (rememberedMobile) {
      setMobile(rememberedMobile);
    }
  }, [isLogin]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setMessageTone('');
    setFieldErrors({});

    try {
      const clientErrors = validateAuthForm({
        acceptedTerms,
        confirmPassword,
        fullName,
        isLogin,
        mobile,
        password,
      });

      if (Object.keys(clientErrors).length > 0) {
        setFieldErrors(clientErrors);
        setMessage('لطفا خطاهای فرم را اصلاح کنید.');
        setMessageTone('error');
        return;
      }

      const normalizedMobile = normalizeIranMobile(mobile);

      if (isLogin) {
        await login({ mobile: normalizedMobile, password });
        if (remember) {
          window.localStorage.setItem('nazr-emam-mobile', normalizedMobile);
        } else {
          window.localStorage.removeItem('nazr-emam-mobile');
        }
        setMessage(copy.success);
        setMessageTone('success');
        window.setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 900);
      } else {
        await register({
          fullName: fullName.trim(),
          mobile: normalizedMobile,
          password,
        });
        setMessage(copy.success);
        setMessageTone('success');
        window.setTimeout(() => {
          router.push('/auth/login');
        }, 1500);
      }
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setMessage(error.message || defaultError);
        setMessageTone('error');
        setFieldErrors(error.fields ?? {});
      } else {
        setMessage(defaultError);
        setMessageTone('error');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLogin) {
    return (
      <main dir="rtl" className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_center,var(--color-auth-bg-start)_0%,var(--color-auth-bg)_50%,var(--color-auth-bg-end)_100%)] px-4 py-8 text-auth-text">
        <section
          className="w-full max-w-[420px] rounded-[14px] border border-auth-card-border bg-auth-card px-[18px] pb-6 pt-7 shadow-auth-dark sm:px-6"
          aria-labelledby="auth-title"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <NazrLogo />
            <h1
              id="auth-title"
              className="mb-1.5 mt-4 text-[16px] font-extrabold leading-7 text-auth-text"
            >
              {copy.title}
            </h1>
            <p className="m-0 text-[11px] leading-5 text-auth-muted">
              حساب کاربری خود را بسازید و نذرهای ثبت‌شده را پیگیری کنید
            </p>
          </div>

          <form className="grid min-w-0 gap-4" onSubmit={handleSubmit} noValidate>
            <label className="grid min-w-0 gap-1.5 text-right text-[11px] font-bold text-auth-text">
              <span>نام و نام خانوادگی</span>
              <input
                autoComplete="name"
                className={getRegisterFieldClass(Boolean(fieldErrors.fullName))}
                dir="rtl"
                maxLength={60}
                name="fullName"
                onChange={(event) => setFullName(event.target.value)}
                placeholder="مثلاً: علی رضایی"
                required
                type="text"
                value={fullName}
              />
              {fieldErrors.fullName ? (
                <small className="text-right text-[10px] font-normal leading-5 text-danger">
                  {fieldErrors.fullName}
                </small>
              ) : null}
            </label>

            <label className="grid min-w-0 gap-1.5 text-right text-[11px] font-bold text-auth-text">
              <span>شماره همراه</span>
              <input
                autoComplete="tel"
                className={getRegisterFieldClass(Boolean(fieldErrors.mobile))}
                dir="ltr"
                inputMode="tel"
                maxLength={11}
                name="mobile"
                onChange={(event) => setMobile(event.target.value)}
                placeholder="09150000000"
                required
                type="tel"
                value={mobile}
              />
              <small className="text-right text-[10px] font-normal leading-5 text-auth-muted">
                شماره همراه ایرانی معتبر وارد کنید
              </small>
              {fieldErrors.mobile ? (
                <small className="text-right text-[10px] font-normal leading-5 text-danger">
                  {fieldErrors.mobile}
                </small>
              ) : null}
            </label>

            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-3">
              <label className="grid min-w-0 gap-1.5 text-right text-[11px] font-bold text-auth-text">
                <span>رمز عبور</span>
                <input
                  autoComplete="new-password"
                  className={getRegisterFieldClass(Boolean(fieldErrors.password))}
                  dir="ltr"
                  minLength={8}
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
                {fieldErrors.password ? (
                  <small className="text-right text-[10px] font-normal leading-5 text-danger">
                    {fieldErrors.password}
                  </small>
                ) : null}
              </label>

              <label className="grid min-w-0 gap-1.5 text-right text-[11px] font-bold text-auth-text">
                <span>تکرار رمز</span>
                <input
                  autoComplete="new-password"
                  className={getRegisterFieldClass(Boolean(fieldErrors.confirmPassword))}
                  dir="ltr"
                  minLength={8}
                  name="confirmPassword"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  type="password"
                  value={confirmPassword}
                />
                {fieldErrors.confirmPassword ? (
                  <small className="text-right text-[10px] font-normal leading-5 text-danger">
                    {fieldErrors.confirmPassword}
                  </small>
                ) : null}
              </label>
            </div>

            <label className="flex min-w-0 cursor-pointer items-center justify-start gap-2 text-right text-[11px] leading-5 text-auth-text">
              <input
                checked={acceptedTerms}
                className="h-3.5 w-3.5 shrink-0 accent-auth-accent"
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                type="checkbox"
              />
              <span className="min-w-0">
                قوانین و شرایط استفاده را می‌پذیرم
              </span>
            </label>
            {fieldErrors.terms ? (
              <small className="-mt-3 text-[10px] leading-5 text-danger">
                {fieldErrors.terms}
              </small>
            ) : null}

            {message ? (
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
            ) : null}

            <button
              className="h-10 w-full min-w-0 cursor-pointer rounded-lg bg-auth-accent text-[13px] font-extrabold text-foreground shadow-auth-action transition hover:bg-auth-accent-dark disabled:cursor-wait disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'در حال ارسال...' : copy.submit}
            </button>
          </form>

          <div className="mt-4 border-t border-auth-card-border pt-3 text-center">
            <p className="m-0 text-[11px] leading-5 text-auth-muted">قبلا ثبت نام کرده‌اید؟</p>
            <Link
              className="mt-2 flex h-9 items-center justify-center rounded-md border border-auth-link-border bg-auth-link-surface text-[12px] font-bold text-auth-link transition hover:text-auth-link"
              href={copy.switchHref}
            >
              {copy.switchLabel}
            </Link>
          </div>

          <Link
            className="mt-4 block text-center text-[11px] text-auth-muted transition hover:text-auth-text"
            href="/"
          >
            خانه
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-background px-4 py-8 text-foreground">
      <section
        className="w-full max-w-[420px] rounded-lg border border-border bg-surface px-5 py-7 shadow-auth sm:px-8 sm:pb-6 sm:pt-8"
        aria-labelledby="auth-title"
      >
        <div
          className="mb-6 flex flex-col items-center gap-2.5 text-[15px] font-bold text-primary-dark"
          aria-label="لوگو"
        >
          <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-primary text-2xl leading-none text-surface">
            ن
          </span>
          <span>نذر امام</span>
        </div>

        <h1
          id="auth-title"
          className="mb-6 text-center text-[22px] font-bold leading-normal text-heading"
        >
          {copy.title}
        </h1>

        <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <label className="grid gap-2 text-sm font-bold text-label">
            <span>شماره موبایل</span>
            <input
              autoComplete="tel"
              className={loginFieldClass}
              dir="ltr"
              inputMode="tel"
              maxLength={11}
              name="mobile"
              onChange={(event) => setMobile(event.target.value)}
              placeholder="09123456789"
              required
              type="tel"
              value={mobile}
            />
            {fieldErrors.mobile ? (
              <small className="text-xs font-normal leading-7 text-danger">
                {fieldErrors.mobile}
              </small>
            ) : null}
          </label>

          <label className="grid gap-2 text-sm font-bold text-label">
            <span>رمز</span>
            <input
              autoComplete="current-password"
              className={loginFieldClass}
              dir="ltr"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            {fieldErrors.password ? (
              <small className="text-xs font-normal leading-7 text-danger">
                {fieldErrors.password}
              </small>
            ) : null}
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-label">
            <input
              checked={remember}
              className="m-0 h-4 w-4 accent-primary"
              onChange={(event) => setRemember(event.target.checked)}
              type="checkbox"
            />
            <span>مرا به خاطر بسپار</span>
          </label>

          {message ? (
            <p
              aria-live="polite"
              className={`m-0 rounded-md px-3 py-2.5 text-right text-[13px] leading-7 ${
                messageTone === 'success'
                  ? 'bg-primary-soft text-primary-dark'
                  : 'bg-danger/10 text-danger'
              }`}
            >
              {message}
            </p>
          ) : null}

          <button
            className="mt-1 h-[46px] cursor-pointer rounded-md bg-primary font-bold text-surface transition hover:-translate-y-px hover:bg-primary-dark disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'در حال ارسال...' : copy.submit}
          </button>
        </form>

        <nav
          className="mt-6 flex justify-center gap-5 border-t border-border pt-4 text-sm"
          aria-label="لینک‌های حساب کاربری"
        >
          <Link className="text-primary transition hover:text-primary-dark" href="/">
            خانه
          </Link>
          <Link
            className="text-primary transition hover:text-primary-dark"
            href={copy.switchHref}
          >
            {copy.switchLabel}
          </Link>
        </nav>
      </section>
    </main>
  );
}

function validateAuthForm({
  acceptedTerms,
  confirmPassword,
  fullName,
  isLogin,
  mobile,
  password,
}: {
  acceptedTerms: boolean;
  confirmPassword: string;
  fullName: string;
  isLogin: boolean;
  mobile: string;
  password: string;
}) {
  const errors: FieldErrors = {};
  const normalizedMobile = normalizeIranMobile(mobile);

  if (!isLogin) {
    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      errors.fullName = 'نام و نام خانوادگی باید حداقل ۲ کاراکتر باشد.';
    }
  }

  if (!normalizedMobile) {
    errors.mobile = 'شماره همراه الزامی است.';
  } else if (!/^\d+$/.test(normalizedMobile)) {
    errors.mobile = 'شماره همراه فقط باید شامل عدد باشد.';
  } else if (!normalizedMobile.startsWith('09')) {
    errors.mobile = 'شماره همراه باید با 09 شروع شود.';
  } else if (normalizedMobile.length !== 11) {
    errors.mobile = 'شماره همراه باید ۱۱ رقم باشد.';
  } else if (!isValidIranMobile(normalizedMobile)) {
    errors.mobile = 'پیش‌شماره همراه معتبر نیست.';
  }

  if (!password) {
    errors.password = 'رمز عبور الزامی است.';
  } else if (!isLogin && !passwordPattern.test(password)) {
    errors.password = 'رمز عبور باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد.';
  }

  if (!isLogin) {
    if (!confirmPassword) {
      errors.confirmPassword = 'تکرار رمز عبور الزامی است.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'تکرار رمز عبور با رمز عبور یکسان نیست.';
    }

    if (!acceptedTerms) {
      errors.terms = 'پذیرش قوانین و شرایط استفاده الزامی است.';
    }
  }

  return errors;
}

function NazrLogo() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-auth-accent text-[18px] font-extrabold leading-none text-foreground">
      ن
    </span>
  );
}
