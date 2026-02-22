import {notFound} from 'next/navigation';
import localFont from 'next/font/local';
import {getMessages} from 'next-intl/server';
import {AppProviders} from '@/components/providers/app-providers';
import {locales} from '@/lib/i18n/config';

const vazirmatn = localFont({
  src: '../fonts/vazirmatn/Vazirmatn-Regular.ttf',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  preload: true,
  variable: '--font-vazirmatn'
});

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <div className={`${vazirmatn.variable} font-sans`}>
      <AppProviders locale={locale} messages={messages}>
        {children}
      </AppProviders>
    </div>
  );
}
