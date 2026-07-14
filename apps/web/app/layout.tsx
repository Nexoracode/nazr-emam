import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../components/layout/theme-provider';
import { Header } from '../components/layout/header';

export const metadata: Metadata = {
  title: 'نذر امام',
  description: 'سامانه ثبت، پرداخت و پیگیری نذر',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <ThemeProvider>
          <Header />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
