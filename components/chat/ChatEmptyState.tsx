'use client';

import { UniversityLogo } from '@/components/branding/UniversityLogo';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { ThinkingLevel } from '@/lib/api/chat';
import { cn } from '@/lib/utils';
import { Composer } from './Composer';

type ChatEmptyStateProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  focusTrigger?: number;
  thinkLevel: ThinkingLevel;
  onThinkLevelChange: (value: ThinkingLevel) => void;
  onPromptSelect: (prompt: string) => void;
};

export function ChatEmptyState({
  value,
  onChange,
  onSubmit,
  disabled,
  autoFocus,
  focusTrigger,
  thinkLevel,
  onThinkLevelChange,
  onPromptSelect
}: ChatEmptyStateProps) {
  const locale = useLocale();
  const t = useTranslations('app');
  const suggestedPrompts = t.raw('emptyState.suggestedPrompts') as string[];

  return (
    <div
      className="h-full min-h-0 scroll-py-20 overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))] sm:px-6 sm:pb-[max(2rem,env(safe-area-inset-bottom))] sm:pt-24"
      dir={locale === 'fa' ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto flex min-h-full w-full max-w-[800px] flex-col justify-between gap-5 py-3 text-center sm:justify-center sm:gap-6 sm:py-4 [@media(max-height:700px)]:gap-3 [@media(max-height:700px)]:py-1">
        <div className="space-y-5 sm:space-y-3">
          <UniversityLogo
            alt={t('emptyState.logoAlt')}
            className="mx-auto h-14 w-14 rounded-2xl bg-[hsl(var(--primary)/0.08)] ring-1 ring-[hsl(var(--primary)/0.13)] sm:h-20 sm:w-20 [@media(max-height:700px)]:h-12 [@media(max-height:700px)]:w-12"
          />

          <div className="space-y-2 sm:space-y-3 [@media(max-height:700px)]:space-y-1.5">
            <h1 className="font-display-fa text-balance text-2xl font-semibold leading-9 text-foreground sm:text-3xl sm:leading-10 md:text-4xl [@media(max-height:700px)]:text-xl [@media(max-height:700px)]:leading-8">
              {t('emptyState.title')}
            </h1>

            <div className="mx-auto max-w-[760px] space-y-1 text-pretty text-muted-foreground">
              <p className="text-[15px] leading-7 sm:text-base sm:leading-8 [@media(max-height:700px)]:text-sm [@media(max-height:700px)]:leading-6">
                {t('emptyState.description')}
              </p>

              <p className="text-sm leading-6 sm:leading-7 [@media(max-height:700px)]:text-xs [@media(max-height:700px)]:leading-5">
                {t('emptyState.facultyDescription')}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-3 sm:space-y-4 [@media(max-height:700px)]:space-y-2.5">
          <Composer
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            disabled={disabled}
            autoFocus={autoFocus}
            focusTrigger={focusTrigger}
            thinkLevel={thinkLevel}
            onThinkLevelChange={onThinkLevelChange}
          />

          <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 sm:gap-2.5 [@media(max-height:700px)]:gap-1.5">
            {suggestedPrompts.map((prompt, index) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPromptSelect(prompt)}
                className={cn(
                  index >= 2 && 'hidden sm:inline-flex',
                  'h-auto min-h-11 min-w-0 max-w-full rounded-2xl border-border bg-[hsl(var(--surface-card))] px-3 py-2 text-[13px] leading-5 text-foreground shadow-sm transition-all sm:px-4 sm:text-sm [@media(max-height:700px)]:py-1.5',
                  'hover:-translate-y-0.5 hover:border-primary/35 hover:bg-accent hover:text-accent-foreground hover:shadow-md active:translate-y-0 active:bg-accent/80',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                <span className="min-w-0 whitespace-normal break-words text-center">
                  {prompt}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
