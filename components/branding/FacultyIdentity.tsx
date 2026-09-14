'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function FacultyIdentity({
  inverse = false,
  className
}: {
  inverse?: boolean;
  className?: string;
}) {
  const t = useTranslations('app.identity');
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs leading-5',
        inverse ? 'text-slate-200' : 'text-muted-foreground',
        className
      )}
    >
      <span>{t('faculty')}</span>
      <span
        className={cn(
          'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-4',
          inverse
            ? 'border-sky-300/30 bg-sky-300/10 text-sky-100'
            : 'border-primary/20 bg-primary/5 text-primary'
        )}
      >
        {t('beta')}
      </span>
    </div>
  );
}
