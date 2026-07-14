'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useTheme } from './theme-provider';

const navLinks = [
  { href: '/nazr/new', label: 'ثبت نذر' },
  { href: '/track', label: 'پیگیری وضعیت' },
];

const profileLinks = [
  { href: '/profile', label: 'پروفایل من' },
  { href: '/dashboard', label: 'نذرهای من' },
  { href: '/auth/login', label: 'ورود به حساب' },
  { href: '/auth/register', label: 'ثبت نام' },
];

export function Header() {
  const { resolved, theme, setTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm transition-colors">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">

        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors"
        >
          <RobotMini />
          <span className="text-[15px] font-extrabold tracking-tight">نذر امام</span>
        </Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            title={resolved === 'dark' ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره'}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            {resolved === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Profile */}
          <div
            className="relative"
            onMouseEnter={handleProfileEnter}
            onMouseLeave={handleProfileLeave}
          >
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--primary-soft)] text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
              onClick={() => setProfileOpen((o) => !o)}
              aria-label="منوی پروفایل"
            >
              <ProfileIcon />
            </button>

            {profileOpen && (
              <div className="absolute left-0 top-10 z-50 min-w-[160px] rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow)]">
                {profileLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-right text-[13px] text-[var(--foreground)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex sm:hidden border-t border-[var(--border)] overflow-x-auto">
        {navLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="shrink-0 px-4 py-2 text-[13px] font-medium text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}

function RobotMini() {
  return (
    <svg width="22" height="22" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <rect x="9" y="11" width="26" height="20" rx="3" fill="currentColor" />
      <rect x="14" y="16" width="5" height="5" rx="1" fill="var(--surface, #fff)" />
      <rect x="25" y="16" width="5" height="5" rx="1" fill="var(--surface, #fff)" />
      <rect x="16" y="24" width="12" height="3" rx="1.5" fill="var(--surface, #fff)" />
      <rect x="19" y="5" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="21" y="8" width="2" height="3" fill="currentColor" />
      <rect x="3" y="16" width="6" height="9" rx="3" fill="currentColor" />
      <rect x="35" y="16" width="6" height="9" rx="3" fill="currentColor" />
      <rect x="13" y="31" width="6" height="8" rx="3" fill="currentColor" />
      <rect x="25" y="31" width="6" height="8" rx="3" fill="currentColor" />
    </svg>
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
