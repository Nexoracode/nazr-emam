'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    /** در layout با اسکریپت inline (قبل از hydrate) ذخیره می‌شود تا رویدادی که
     *  قبل از mount کامپوننت شلیک شده از دست نرود. */
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /android/i.test(window.navigator.userAgent);
}

const IOS_STEPS = [
  'دکمه‌ی اشتراک‌گذاری (Share) را در نوار پایین سافاری بزنید.',
  'گزینه‌ی «افزودن به صفحه اصلی» (Add to Home Screen) را انتخاب کنید.',
  'روی «افزودن» بزنید — آیکون نذر امام روی صفحه اصلی گوشی می‌نشیند.',
];

const ANDROID_STEPS = [
  'دکمه‌ی منوی سه‌نقطه (⋮) را در بالای مرورگر کروم بزنید.',
  'گزینه‌ی «نصب برنامه» یا «Add to Home screen» را انتخاب کنید.',
  'روی «نصب» بزنید — آیکون نذر امام روی صفحه اصلی گوشی می‌نشیند.',
];

/**
 * دکمه نصب وب‌اپ:
 * - اگر مرورگر رویداد نصب را پشتیبانی کند (کروم اندروید/دسکتاپ): دیالوگ
 *   رسمی نصب باز می‌شود.
 * - آیفون: راهنمای «اشتراک‌گذاری ← افزودن به صفحه اصلی».
 * - اندروید بدون رویداد (مرورگرهای درون‌برنامه‌ای و غیر کروم): راهنمای
 *   منوی سه‌نقطه.
 * - در حالت standalone (نصب‌شده) دکمه نمایش داده نمی‌شود.
 */
export default function InstallAppButton({ variant = 'full' }: { variant?: 'full' | 'icon' }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dialogSteps, setDialogSteps] = useState<string[] | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    setHidden(false);
    // رویدادی که قبل از mount شلیک شده را از window بردار
    setDeferred(window.__pwaInstallPrompt ?? null);
    const handler = (event: Event) => {
      event.preventDefault();
      window.__pwaInstallPrompt = event as BeforeInstallPromptEvent;
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    const prompt = deferred ?? window.__pwaInstallPrompt ?? null;
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      window.__pwaInstallPrompt = null;
      setDeferred(null);
      return;
    }
    setDialogSteps(isIos() ? IOS_STEPS : isAndroid() ? ANDROID_STEPS : IOS_STEPS);
  };

  if (hidden) return null;

  return (
    <>
      <button
        className={variant === 'icon' ? 'install-app-btn is-icon' : 'install-app-btn'}
        onClick={install}
        title="نصب اپ نذر امام روی گوشی"
        aria-label="نصب اپ نذر امام"
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="none"
          height={variant === 'icon' ? 17 : 16}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={variant === 'icon' ? 17 : 16}
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
        {variant === 'full' ? <span>نصب اپ نذر امام</span> : null}
      </button>

      {dialogSteps ? (
        <div className="install-app-overlay" onClick={() => setDialogSteps(null)} role="presentation">
          <div className="install-app-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3>{dialogSteps === IOS_STEPS ? 'نصب روی آیفون' : 'نصب روی اندروید'}</h3>
            <ol>
              {dialogSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <button className="install-app-close" onClick={() => setDialogSteps(null)} type="button">
              متوجه شدم
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
