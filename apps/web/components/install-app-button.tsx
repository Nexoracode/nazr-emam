'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
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

/**
 * دکمه نصب وب‌اپ:
 * - اندروید/کروم: رویداد beforeinstallprompt را می‌گیرد و با کلیک، دیالوگ
 *   رسمی نصب را باز می‌کند.
 * - iOS سافاری (که این رویداد را ندارد): راهنمای «اشتراک‌گذاری ← افزودن به
 *   صفحه اصلی» را نشان می‌دهد.
 * - اگر اپ از قبل نصب شده باشد (حالت standalone) دکمه نمایش داده نمی‌شود.
 */
export default function InstallAppButton({ variant = 'full' }: { variant?: 'full' | 'icon' }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    setHidden(false);
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    setShowIosHint(true);
  };

  if (hidden) return null;

  return (
    <>
      <button
        className={variant === 'icon' ? 'install-app-btn is-icon' : 'install-app-btn'}
        onClick={install}
        title="نصب وب‌اپ نذر امام روی گوشی"
        type="button"
      >
        {variant === 'icon' ? (
          <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
        ) : null}
        <span>نصب اپ نذر امام</span>
      </button>

      {showIosHint ? (
        <div className="install-app-overlay" onClick={() => setShowIosHint(false)} role="presentation">
          <div className="install-app-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3>نصب روی آیفون</h3>
            <ol>
              <li>
                دکمه‌ی <b>اشتراک‌گذاری (Share)</b> را در نوار پایین سافاری بزنید.
              </li>
              <li>
                گزینه‌ی <b>افزودن به صفحه اصلی (Add to Home Screen)</b> را انتخاب کنید.
              </li>
              <li>
                روی <b>افزودن (Add)</b> بزنید — آیکون نذر امام روی صفحه اصلی گوشی می‌نشیند.
              </li>
            </ol>
            <button className="install-app-close" onClick={() => setShowIosHint(false)} type="button">
              متوجه شدم
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
