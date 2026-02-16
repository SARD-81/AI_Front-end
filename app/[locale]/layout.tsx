import {notFound} from 'next/navigation';
import {Vazirmatn} from 'next/font/google';
import {getMessages} from 'next-intl/server';
import {AppProviders} from '@/components/providers/app-providers';
import {locales} from '@/lib/i18n/config';

const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
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
