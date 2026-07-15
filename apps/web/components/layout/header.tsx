'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { logout } from '../../lib/api';
import { useAuth } from '../../lib/use-auth';
import { useTheme } from './theme-provider';

const navLinks = [
  { href: '/#why', label: 'چرا نذر امام' },
  { href: '/#reports', label: 'گزارش‌ها' },
  { href: '/#plans', label: 'طرح‌ها' },
  { href: '/#faq', label: 'سوالات' },
];

export function Header() {
  const { resolved, theme, setTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const auth = useAuth();
  const router = useRouter();

  function handleProfileEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setProfileOpen(true);
  }

  function handleProfileLeave() {
    closeTimer.current = setTimeout(() => setProfileOpen(false), 150);
  }

  function cycleTheme() {
    if (theme === 'system') setTheme(resolved === 'dark' ? 'light' : 'dark');
    else if (theme === 'light') setTheme('dark');
    else setTheme('light');
  }

  async function handleLogout() {
    setProfileOpen(false);
    try {
      await logout();
    } catch {
      /* ignore */
    }
    router.push('/auth/login');
    router.refresh();
  }

  const profileLinks = auth.user
    ? [
        { href: '/profile', label: 'پروفایل من', action: undefined },
        { href: '/dashboard', label: 'نذرهای من', action: undefined },
        { href: '#', label: 'خروج از حساب', action: handleLogout },
      ]
    : [
        { href: '/auth/login', label: 'ورود به حساب', action: undefined },
        { href: '/auth/register', label: 'ثبت نام', action: undefined },
      ];

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand" aria-label="نذر امام">
          <span className="site-brand-mark" aria-hidden="true">
            ن
          </span>
          <span>نذر امام</span>
        </Link>

        <nav className="site-nav" aria-label="ناوبری اصلی">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="site-actions">
          <Link className="site-cta" href="/nazr/new">
            شرکت در نذر
          </Link>

          <button
            onClick={cycleTheme}
            title={resolved === 'dark' ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره'}
            className="site-icon-button"
            type="button"
          >
            {resolved === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          <div className="site-profile" onMouseEnter={handleProfileEnter} onMouseLeave={handleProfileLeave}>
            <button
              className="site-icon-button site-profile-button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-label="منوی پروفایل"
              type="button"
            >
              <ProfileIcon />
            </button>

            {profileOpen && (
              <div className="site-profile-menu">
                {auth.loading ? (
                  <span>...</span>
                ) : (
                  profileLinks.map((link) =>
                    link.action ? (
                      <button key={link.label} onClick={link.action} type="button">
                        {link.label}
                      </button>
                    ) : (
                      <Link key={link.href} href={link.href} onClick={() => setProfileOpen(false)}>
                        {link.label}
                      </Link>
                    ),
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="site-mobile-nav" aria-label="ناوبری موبایل">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
