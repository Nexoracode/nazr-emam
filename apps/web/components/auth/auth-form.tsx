'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiRequestError, login, register } from '../../lib/api';

type AuthMode = 'login' | 'register';

interface AuthFormProps {
  mode: AuthMode;
}

type FieldErrors = Record<string, string>;

const defaultError = 'درخواست انجام نشد. لطفا کمی بعد دوباره تلاش کنید.';
const loginFieldClass =
  'h-[46px] w-full min-w-0 rounded-md border border-field-border bg-surface px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15';
const registerLightFieldClass =
  'h-10 w-full min-w-0 rounded-lg border border-transparent bg-auth-input px-3 text-left text-[12px] text-foreground outline-none transition placeholder:text-muted focus:border-auth-accent focus:ring-2 focus:ring-auth-accent/25';
const registerDarkFieldClass =
  'h-10 w-full min-w-0 rounded-lg border border-auth-input-border bg-auth-input-dark px-3 text-left text-[12px] text-auth-text outline-none transition placeholder:text-auth-muted focus:border-auth-accent focus:ring-2 focus:ring-auth-accent/25';

const mobilePattern = /^09\d{9}$/;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isLogin = mode === 'login';
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
      title: isLogin ? 'فرم ورود' : 'عضویت در ببینیم',
      submit: isLogin ? 'ورود' : 'ثبت نام',
      switchLabel: isLogin ? 'ثبت نام' : 'ورود به حساب',
      switchHref: isLogin ? '/auth/register' : '/auth/login',
      success: isLogin
        ? 'ورود با موفقیت انجام شد.'
        : 'حساب کاربری شما ساخته شد.',
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

      if (isLogin) {
        await login({ mobile: mobile.trim(), password });
        if (remember) {
          window.localStorage.setItem('nazr-emam-mobile', mobile.trim());
        } else {
          window.localStorage.removeItem('nazr-emam-mobile');
        }
      } else {
        const normalizedMobile = mobile.trim();
        await register({
          fullName: `کاربر ${normalizedMobile}`,
          mobile: normalizedMobile,
          password,
        });
      }

      setMessage(copy.success);
      setMessageTone('success');

      if (!isLogin) {
        setMobile('');
        setPassword('');
        setConfirmPassword('');
        setAcceptedTerms(false);
      } else {
        window.setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 900);
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
          className="w-full max-w-[380px] rounded-[14px] border border-auth-card-border bg-auth-card px-[18px] pb-6 pt-7 shadow-auth-dark"
          aria-labelledby="auth-title"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <CameraLogo />
            <h1
              id="auth-title"
              className="mb-1.5 mt-4 text-[16px] font-extrabold leading-7 text-auth-text"
            >
              {copy.title}
            </h1>
            <p className="m-0 text-[11px] leading-5 text-auth-muted">
              حساب کاربری خود را بسازید و تماشای گروهی را شروع کنید
            </p>
          </div>

          <form className="grid min-w-0 gap-4" onSubmit={handleSubmit} noValidate>
            <label className="grid min-w-0 gap-1.5 text-right text-[11px] font-bold text-auth-text">
              <span>شماره تلفن</span>
              <input
                autoComplete="tel"
                className={registerLightFieldClass}
                dir="ltr"
                inputMode="tel"
                name="mobile"
                onChange={(event) => setMobile(event.target.value)}
                placeholder="09150553208"
                required
                type="tel"
                value={mobile}
              />
              <small className="text-left text-[10px] font-normal leading-5 text-auth-muted">
                شماره تلفن ایرانی معتبر وارد کنید
              </small>
              {fieldErrors.mobile ? (
                <small className="text-[10px] font-normal leading-5 text-danger">
                  {fieldErrors.mobile}
                </small>
              ) : null}
            </label>

            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-3">
              <label className="grid min-w-0 gap-1.5 text-right text-[11px] font-bold text-auth-text">
                <span>رمز عبور</span>
                <input
                autoComplete="new-password"
                className={registerLightFieldClass}
                dir="ltr"
                  minLength={8}
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>

              <label className="grid min-w-0 gap-1.5 text-right text-[11px] font-bold text-auth-text">
                <span>تکرار رمز</span>
                <input
                autoComplete="new-password"
                className={registerDarkFieldClass}
                dir="ltr"
                  minLength={8}
                  name="confirmPassword"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  type="password"
                  value={confirmPassword}
                />
              </label>
            </div>

            <div className="-mt-1 text-left text-[10px] leading-5 text-auth-muted">
              رمز عبور به حروف بزرگ و کوچک حساس است. دقت کنید Caps Lock خاموش باشد.
              {fieldErrors.password ? (
                <p className="m-0 text-danger">{fieldErrors.password}</p>
              ) : null}
              {fieldErrors.confirmPassword ? (
                <p className="m-0 text-danger">{fieldErrors.confirmPassword}</p>
              ) : null}
            </div>

            <label className="flex min-w-0 cursor-pointer items-center justify-end gap-2 text-[11px] leading-5 text-auth-text">
              <input
                checked={acceptedTerms}
                className="h-3.5 w-3.5 accent-auth-accent"
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                type="checkbox"
              />
              <span>
                من{' '}
                <a className="font-bold text-auth-link hover:text-auth-link" href="#">
                  قوانین
                </a>{' '}
                و{' '}
                <a className="font-bold text-auth-link hover:text-auth-link" href="#">
                  شرایط استفاده
                </a>{' '}
                را قبول دارم
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
            <small className="text-xs font-normal leading-7 text-muted">
              توجه: رمز عبور به حروف بزرگ و کوچک حساس است
            </small>
            {fieldErrors.password ? (
              <small className="text-xs font-normal leading-7 text-danger">
                {fieldErrors.password}
              </small>
            ) : null}
          </label>

          <div className="flex flex-col gap-3 text-[13px] sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap text-label">
              <input
                checked={remember}
                className="m-0 h-4 w-4 accent-primary"
                onChange={(event) => setRemember(event.target.checked)}
                type="checkbox"
              />
              <span>مرا به خاطر بسپار</span>
            </label>
            <Link
              className="text-primary transition hover:text-primary-dark"
              href="/auth/forgot-password"
            >
              رمز عبور خود را فراموش کرده‌اید؟
            </Link>
          </div>

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

        <a
          className="mt-4 block text-center text-[13px] text-muted transition hover:text-primary-dark"
          href="mailto:support@example.com"
        >
          کمک/بازخورد
        </a>
      </section>
    </main>
  );
}

function validateAuthForm({
  acceptedTerms,
  confirmPassword,
  isLogin,
  mobile,
  password,
}: {
  acceptedTerms: boolean;
  confirmPassword: string;
  isLogin: boolean;
  mobile: string;
  password: string;
}) {
  const errors: FieldErrors = {};
  const normalizedMobile = mobile.trim();

  if (!normalizedMobile) {
    errors.mobile = 'شماره تلفن الزامی است.';
  } else if (!mobilePattern.test(normalizedMobile)) {
    errors.mobile = 'شماره تلفن باید با 09 شروع شود و 11 رقم باشد.';
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

function CameraLogo() {
  return (
    <svg
      aria-hidden="true"
      className="h-8 w-8 text-auth-accent"
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.5 9.5h9.2l2.2 3.2H26v9.8H6v-9.8h2.3l2.2-3.2Z"
        fill="currentColor"
      />
      <path d="M24.8 13.8 29 11.7v11.1l-4.2-2.1v-6.9Z" fill="currentColor" />
      <path d="M9.2 6h2.6v2.6H9.2V6Zm5.5-1.6h2.6v3.4h-2.6V4.4Zm5.5 1.6h2.6v2.6h-2.6V6Z" fill="currentColor" />
      <path
        d="M11 15.5h3.2v3.2H11v-3.2Zm6.8 0H21v3.2h-3.2v-3.2Z"
        fill="var(--color-auth-card)"
      />
      <path d="M12 24.8h8v2.8h-8v-2.8Z" fill="currentColor" />
    </svg>
  );
}
