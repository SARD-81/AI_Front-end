import '../globals.css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import localFont from 'next/font/local';
import { getMessages } from 'next-intl/server';
import { AppProviders } from '@/components/providers/app-providers';
import { locales } from '@/lib/i18n/config';

const vazirmatn = localFont({
  src: '../fonts/vazirmatn/Vazirmatn-Regular.ttf',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  preload: true,
  variable: '--font-vazirmatn'
});

const METADATA_BY_LOCALE: Record<
  string,
  { title: string; description: string }
> = {
  fa: {
    title: 'سها',
    description: 'دستیار هوشمند دانشگاه شهید بهشتی'
  },
  en: {
    title: 'سها',
    description: 'Shahid Beheshti University AI assistant'
  }
};

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = METADATA_BY_LOCALE[locale] ?? METADATA_BY_LOCALE.fa;

  return {
    title: meta.title,
    description: meta.description
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  const messages = await getMessages();
  const direction = locale === 'fa' ? 'rtl' : 'ltr';
  const skipToContentLabel =
    locale === 'fa' ? 'پرش به محتوای اصلی' : 'Skip to main content';

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body
        className={`${vazirmatn.variable} min-h-screen bg-background font-sans text-foreground`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          {skipToContentLabel}
        </a>
        <AppProviders locale={locale} messages={messages}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
