'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: 'light' | 'dark';
}

const Ctx = createContext<ThemeCtx>({
  theme: 'system',
  setTheme: () => {},
  resolved: 'light',
});

const STORAGE_KEY = 'nazr-emam-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system';
    setThemeState(stored);
    apply(stored);
  }, []);

  function apply(t: Theme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = t === 'dark' || (t === 'system' && prefersDark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    setResolved(dark ? 'dark' : 'light');
  }

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    apply(t);
  }

  return <Ctx.Provider value={{ theme, setTheme, resolved }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
