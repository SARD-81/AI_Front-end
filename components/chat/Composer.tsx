'use client';

import {motion} from 'motion/react';
import {ArrowUp, Check, ChevronDown, Square} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useRef} from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type {ThinkingLevel} from '@/lib/api/chat';
import {cn} from '@/lib/utils';
import {formatDigitsForLocale} from '@/lib/utils/digits';

const MAX_MESSAGE_LENGTH = 2500;

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isSending?: boolean;
  onStop?: () => void;
  autoFocus?: boolean;
  focusTrigger?: number;
  thinkLevel: ThinkingLevel;
  onThinkLevelChange: (value: ThinkingLevel) => void;
};

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  isSending,
  onStop,
  autoFocus,
  focusTrigger,
  thinkLevel,
  onThinkLevelChange
}: ComposerProps) {
  const t = useTranslations('app');
  const locale = useLocale();
  const thinkingLevels: ThinkingLevel[] = ['low', 'medium', 'high'];
  const characterCount = value.length;
  const showCharacterCounter = characterCount > MAX_MESSAGE_LENGTH * 0.8;
  // Once the cap is reached the browser silently drops further keystrokes, so
  // the counter switches to a warning style to explain why typing "stopped".
  const isAtCharacterLimit = characterCount >= MAX_MESSAGE_LENGTH;
  const canSend = !disabled && value.trim().length > 0;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (focusTrigger === undefined) return;
    textareaRef.current?.focus();
  }, [focusTrigger]);

  return (
    <motion.div
      layoutId="chat-composer"
      transition={{duration: 0.22, ease: 'easeOut'}}
      /*
       * Gemini-style single pill: one rounded container owns the border, the
       * textarea inside is completely chrome-less so focusing it does not draw
       * a second box or ring.
       */
      className="mx-auto w-full max-w-[800px] rounded-[28px] border border-[hsl(var(--field-border))] bg-[hsl(var(--surface-card))] px-4 py-3 shadow-card"
    >
      <TextareaAutosize
        minRows={1}
        maxRows={8}
        maxLength={MAX_MESSAGE_LENGTH}
        value={value}
        ref={textareaRef}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('composerPlaceholder')}
        disabled={disabled}
        className="w-full resize-none border-0 bg-transparent px-1 py-1 text-[15px] leading-7 text-[hsl(var(--field-foreground))] shadow-none outline-none ring-0 placeholder:text-[hsl(var(--field-placeholder))] focus:border-0 focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-70"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            // Don't submit while an IME composition session is active
            // (e.g. Japanese/Chinese input), Enter confirms the composition.
            if (event.nativeEvent.isComposing) return;
            event.preventDefault();
            onSubmit();
          }
        }}
        aria-label={t('composerPlaceholder')}
        aria-describedby="composer-keyboard-hint composer-character-counter"
      />

      <div className="mt-1.5 flex items-center gap-2">
        <DropdownMenu dir={locale === 'fa' ? 'rtl' : 'ltr'}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label={t('thinkingLevel.label')}
              title={t('thinkingLevel.description')}
              className="flex min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-[hsl(var(--surface-elevated))] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] disabled:cursor-not-allowed disabled:opacity-60 data-[state=open]:bg-[hsl(var(--surface-elevated))] data-[state=open]:text-foreground"
            >
              <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t(`thinkingLevel.options.${thinkLevel}.title`)}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={10}
            className="w-[19rem] max-w-[calc(100vw-2rem)] rounded-2xl border-menu-border bg-menu p-2 shadow-xl"
          >
            {thinkingLevels.map((level) => {
              const isActive = level === thinkLevel;
              return (
                <DropdownMenuItem
                  key={level}
                  onSelect={() => onThinkLevelChange(level)}
                  className={cn(
                    'h-auto items-start gap-3 rounded-xl px-3 py-2.5 text-start',
                    isActive && 'bg-[hsl(var(--surface-elevated))]'
                  )}
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    {isActive ? <Check className="h-4 w-4 text-primary" strokeWidth={2.5} /> : null}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
                    <span className={cn('text-sm leading-6', isActive ? 'font-semibold text-foreground' : 'text-foreground/90')}>
                      {t(`thinkingLevel.options.${level}.title`)}
                    </span>
                    <span className="text-xs leading-5 text-muted-foreground">
                      {t(`thinkingLevel.options.${level}.subtitle`)}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Counter only appears near the cap so the bar stays clean. */}
        <div
          id="composer-character-counter"
          aria-live="polite"
          className={cn(
            'text-xs tabular-nums transition-opacity',
            showCharacterCounter ? 'text-muted-foreground opacity-100' : 'sr-only opacity-0',
            isAtCharacterLimit && 'font-medium text-[hsl(var(--danger-text))]'
          )}
          dir="ltr"
        >
          {formatDigitsForLocale(characterCount, locale)} /{' '}
          {formatDigitsForLocale(MAX_MESSAGE_LENGTH, locale)}
        </div>

        {isSending && onStop ? (
          <button
            type="button"
            onClick={onStop}
            aria-label={t('stop')}
            title={t('stop')}
            className="ms-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] active:scale-[0.97]"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSend}
            aria-label={t('send')}
            title={t('send')}
            className={cn(
              'ms-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] active:scale-[0.97]',
              canSend
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'cursor-not-allowed bg-[hsl(var(--surface-elevated))] text-muted-foreground/60'
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Kept for screen readers and aria-describedby, no longer visual noise. */}
      <p id="composer-keyboard-hint" className="sr-only">
        {t('composerKeyboardHint')}
      </p>
    </motion.div>
  );
}
