import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nazr Emam',
  description: 'Nazr Emam project frontend',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
