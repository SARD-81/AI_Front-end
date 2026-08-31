'use client';

import Image from 'next/image';
import {useLocale, useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import type {ThinkingLevel} from '@/lib/api/chat';
import {cn} from '@/lib/utils';
import {Composer} from './Composer';

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
      className="h-full min-h-0 overflow-y-auto overscroll-y-contain scroll-py-20 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] sm:px-4 sm:pb-[max(2rem,env(safe-area-inset-bottom))] sm:pt-20"
      dir={locale === 'fa' ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto flex min-h-full w-full max-w-[800px] flex-col justify-center gap-4 py-2 text-center sm:gap-6 sm:py-4 [@media(max-height:700px)]:gap-3 [@media(max-height:700px)]:py-1">
        <div className="mx-auto h-16 w-16 shrink-0 rounded-full border border-border bg-muted p-[3px] shadow-soft dark:border-white/15 sm:h-20 sm:w-20 [@media(max-height:700px)]:h-14 [@media(max-height:700px)]:w-14">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white p-2 dark:bg-white">
            <Image
              src="/Logo.png"
              alt={t('emptyState.logoAlt')}
              width={60}
              height={60}
              priority
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3 [@media(max-height:700px)]:space-y-1.5">
          <h1 className="text-balance text-xl font-semibold leading-8 text-foreground sm:text-2xl sm:leading-10 md:text-3xl [@media(max-height:700px)]:text-lg [@media(max-height:700px)]:leading-7">
            {t('emptyState.title')}
          </h1>
          <p className="mx-auto max-w-[720px] text-pretty text-sm leading-6 text-muted-foreground sm:leading-7 md:text-base [@media(max-height:700px)]:text-xs [@media(max-height:700px)]:leading-5">
            {t('emptyState.description')}
          </p>
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
                  index >= 3 && 'hidden sm:inline-flex',
                  'h-auto min-w-0 max-w-full rounded-full border-border bg-background px-3 py-2 text-xs leading-5 text-foreground transition-colors sm:px-4 sm:text-sm [@media(max-height:700px)]:py-1.5',
                  'hover:bg-accent hover:text-accent-foreground active:bg-accent/80',
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
