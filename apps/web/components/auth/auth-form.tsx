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

const defaultError = 'درخواست انجام نشد. لطفاً کمی بعد دوباره تلاش کنید.';
const fieldClass =
  'h-[46px] rounded-md border border-field-border bg-surface px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15';

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isLogin = mode === 'login';
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const copy = useMemo(
    () => ({
      title: isLogin ? 'فرم ورود' : 'فرم ثبت نام',
      submit: isLogin ? 'ورود' : 'ثبت نام',
      switchLabel: isLogin ? 'ثبت نام' : 'ورود',
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
    setFieldErrors({});

    try {
      if (isLogin) {
        await login({ mobile: mobile.trim(), password });
        if (remember) {
          window.localStorage.setItem('nazr-emam-mobile', mobile.trim());
        } else {
          window.localStorage.removeItem('nazr-emam-mobile');
        }
      } else {
        await register({
          fullName: fullName.trim(),
          mobile: mobile.trim(),
          password,
        });
      }

      setMessage(copy.success);
      router.push('/');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setMessage(error.message || defaultError);
        setFieldErrors(error.fields ?? {});
      } else {
        setMessage(defaultError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8 text-foreground">
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
          {!isLogin ? (
            <label className="grid gap-2 text-sm font-bold text-label">
              <span>نام کامل</span>
              <input
                autoComplete="name"
                className={fieldClass}
                inputMode="text"
                name="fullName"
                onChange={(event) => setFullName(event.target.value)}
                required
                type="text"
                value={fullName}
              />
              {fieldErrors.fullName ? (
                <small className="text-xs font-normal leading-7 text-danger">
                  {fieldErrors.fullName}
                </small>
              ) : null}
            </label>
          ) : null}

          <label className="grid gap-2 text-sm font-bold text-label">
            <span>شماره موبایل</span>
            <input
              autoComplete="tel"
              className={fieldClass}
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
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className={fieldClass}
              minLength={8}
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

          {isLogin ? (
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
          ) : null}

          {message ? (
            <p className="m-0 rounded-md bg-primary-soft px-3 py-2.5 text-[13px] leading-7 text-primary-dark">
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
