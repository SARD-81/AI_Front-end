import type { Metadata } from 'next';
import { Vazirmatn } from 'next/font/google';
import '@/app/globals.css';
import { MswProvider } from '@/components/layout/MswProvider';
import { AppErrorBoundary } from '@/components/system/AppErrorBoundary';

const vazirmatn = Vazirmatn({ subsets: ['arabic'] });

export const metadata: Metadata = {
  title: 'چت هوش مصنوعی',
  description: 'رابط کاربری چت مبتنی بر هوش مصنوعی',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className={vazirmatn.className}>
        <MswProvider />
        <AppErrorBoundary>{children}</AppErrorBoundary>
      </body>
    </html>
  );
}
