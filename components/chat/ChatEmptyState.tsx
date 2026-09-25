'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ChatEmptyState({
  onPromptSelect
}: {
  onPromptSelect: (prompt: string) => void;
}) {
  const locale = useLocale();
  const t = useTranslations('app');
  const suggestedPrompts = t.raw('emptyState.suggestedPrompts') as string[];

  return (
    <div
      className="h-full min-h-0 overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-6"
      dir={locale === 'fa' ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-4 text-center">
        <div className="space-y-2">
          <h2 className="text-balance text-xl font-semibold leading-8 text-foreground sm:text-2xl">
            {t('emptyState.title')}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {t('emptyState.coverageLine')}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            {t('emptyState.facultyDescription')}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-center gap-2">
          {suggestedPrompts.map((prompt, index) => (
            <Button
              key={prompt}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPromptSelect(prompt)}
              className={cn(
                index >= 4 && 'hidden sm:inline-flex',
                'h-auto min-h-11 max-w-full rounded-2xl px-3 py-2 text-[13px] leading-5'
              )}
            >
              <span className="whitespace-normal break-words text-center">{prompt}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
