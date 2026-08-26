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
      className="flex h-full min-h-0 overflow-y-auto overscroll-contain px-3 pb-6 pt-20 sm:px-4 sm:pb-8 sm:pt-20"
      dir={locale === 'fa' ? 'rtl' : 'ltr'}
    >
      <div className="my-auto w-full max-w-[800px] space-y-4 text-center sm:mx-auto sm:space-y-6">
        <div className="mx-auto h-16 w-16 rounded-full border border-border bg-muted p-[3px] shadow-soft dark:border-white/15 sm:h-20 sm:w-20">
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

        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-balance text-xl font-semibold leading-8 text-foreground sm:text-2xl sm:leading-10 md:text-3xl">
            {t('emptyState.title')}
          </h1>
          <p className="mx-auto max-w-[720px] text-pretty text-sm leading-6 text-muted-foreground sm:leading-7 md:text-base">
            {t('emptyState.description')}
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
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

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            {suggestedPrompts.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPromptSelect(prompt)}
                className={cn(
                  'h-auto max-w-full rounded-full border-border bg-background px-3 py-2 text-xs leading-5 text-foreground transition-colors sm:px-4 sm:text-sm',
                  'hover:bg-accent hover:text-accent-foreground active:bg-accent/80',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                <span className="whitespace-normal text-center">{prompt}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
