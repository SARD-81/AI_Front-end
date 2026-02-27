'use client';

import Image from 'next/image';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import type {ThinkingLevel} from '@/lib/api/chat';
import {cn} from '@/lib/utils';
import {Composer} from './Composer';



type ChatEmptyStateProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  search: boolean;
  thinkingLevel: ThinkingLevel;
  onToggleSearch: () => void;
  onThinkingLevelChange: (value: ThinkingLevel) => void;
  autoFocus?: boolean;
  focusTrigger?: number;
  onPromptSelect: (prompt: string) => void;
};

export function ChatEmptyState({
  value,
  onChange,
  onSubmit,
  disabled,
  search,
  thinkingLevel,
  onToggleSearch,
  onThinkingLevelChange,
  autoFocus,
  focusTrigger,
  onPromptSelect
}: ChatEmptyStateProps) {
  const t = useTranslations('app');
  const suggestedPrompts = t.raw('emptyState.suggestedPrompts') as string[];
  return (
    <div className="flex h-full items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-[800px] space-y-6 text-center">
        <div className="mx-auto h-20 w-20 rounded-full border border-border bg-muted p-[3px] shadow-soft">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
            <Image
              src="/logo.png"
              alt={t('emptyState.logoAlt')}
              width={60}
              height={60}
              priority
              className="h-60 w-60 object-contain"
            />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-balance text-2xl font-semibold leading-10 text-foreground md:text-3xl">
            {t('emptyState.title')}
          </h1>
          <p className="mx-auto max-w-[720px] text-pretty text-sm leading-7 text-muted-foreground md:text-base">
            {t('emptyState.description')}
          </p>
        </div>

        <div className="space-y-4">
          <Composer
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            disabled={disabled}
            search={search}
            thinkingLevel={thinkingLevel}
            onToggleSearch={onToggleSearch}
            onThinkingLevelChange={onThinkingLevelChange}
            autoFocus={autoFocus}
            focusTrigger={focusTrigger}
          />

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {suggestedPrompts.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPromptSelect(prompt)}
                className={cn(
                  'h-auto rounded-full border-border bg-background px-4 py-2 text-sm text-foreground transition-colors',
                  'hover:bg-accent hover:text-accent-foreground active:bg-accent/80',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
