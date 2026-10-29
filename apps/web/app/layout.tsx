import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { ThemeProvider } from '../components/layout/theme-provider';
import PersianNumerals from '../components/persian-numerals';

export const metadata: Metadata = {
  title: 'نذر امام',
  description: 'سامانه ثبت، پرداخت و پیگیری نذر',
  manifest: '/manifest.webmanifest',
  applicationName: 'نذر امام',
  appleWebApp: {
    capable: true,
    title: 'نذر امام',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0d6952',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
      {/*
        رویداد beforeinstallprompt ممکن است قبل از hydrate شدن React شلیک شود؛
        این اسکریپت آن را زودهنگام می‌گیرد تا دکمه نصب روی اندروید درست کار کند.
      */}
      <Script
        id="pwa-install-prompt-capture"
        strategy="beforeInteractive"
      >{`window.__pwaInstallPrompt=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaInstallPrompt=e;});`}</Script>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <PersianNumerals />
      </body>
    </html>
  );
}
