'use client';

import {useEffect} from 'react';
import {useTranslations} from 'next-intl';

export default function LocaleError({
  error,
  reset
}: {
  error: Error & {digest?: string};
  reset: () => void;
}) {
  const t = useTranslations('errors');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <p className="max-w-md text-sm leading-7 text-muted-foreground">
        {t('description')}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
      >
        {t('retry')}
      </button>
    </main>
  );
}
