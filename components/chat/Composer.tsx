'use client';

import {motion} from 'motion/react';
import {ArrowUp, Check, ChevronDown, Globe, Square} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useRef, useState} from 'react';
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
  const isAtCharacterLimit = characterCount >= MAX_MESSAGE_LENGTH;
  const canSend = !disabled && value.trim().length > 0;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const restoreFocusRef = useRef(false);
  const [webSearchOn, setWebSearchOn] = useState(false);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (focusTrigger === undefined || disabled) return;
    textareaRef.current?.focus();
  }, [focusTrigger, disabled]);

  useEffect(() => {
    if (disabled) return;
    if (!restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    const mobile =
      window.matchMedia('(max-width: 767px)').matches ||
      window.matchMedia('(pointer: coarse)').matches;
    if (mobile) return;
    const active = document.activeElement;
    const idle =
      !active || active === document.body || active === textareaRef.current;
    if (!idle) return;
    textareaRef.current?.focus();
  }, [disabled]);

  return (
    <motion.div
      layoutId="chat-composer"
      transition={{duration: 0.22, ease: 'easeOut'}}
      className="mx-auto w-full max-w-3xl rounded-2xl border border-[hsl(var(--field-border))] bg-[hsl(var(--surface-card))] px-2 py-1.5 shadow-[0_14px_36px_-22px_rgba(4,72,101,0.55)] transition-colors focus-within:border-[hsl(var(--primary)/0.6)] focus-within:ring-2 focus-within:ring-[hsl(var(--primary)/0.12)] sm:px-3"
    >
      <div className="flex items-end gap-1">
      <TextareaAutosize
        minRows={1}
        maxRows={6}
        maxLength={MAX_MESSAGE_LENGTH}
        value={value}
        dir={value.trim() ? 'auto' : locale === 'fa' ? 'rtl' : 'ltr'}
        style={{unicodeBidi: 'normal', textAlign: 'start'}}
        ref={textareaRef}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('composerPlaceholder')}
        disabled={disabled}
        onFocus={() => {
          restoreFocusRef.current = true;
        }}
        onBlur={(event) => {
          if (event.relatedTarget && event.relatedTarget !== textareaRef.current) {
            restoreFocusRef.current = false;
          }
        }}
        className="max-h-36 min-h-11 flex-1 resize-none overflow-y-auto overscroll-contain border-0 bg-transparent px-1 py-2 text-base leading-6 text-[hsl(var(--field-foreground))] shadow-none outline-none ring-0 placeholder:text-[hsl(var(--field-placeholder))] focus:border-0 focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-70"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            if (event.nativeEvent.isComposing) return;
            event.preventDefault();
            onSubmit();
          }
        }}
        aria-label={t('composerPlaceholder')}
        aria-describedby="composer-keyboard-hint composer-character-counter"
      />

      <div className="mb-0.5 flex shrink-0 items-center">
        <DropdownMenu dir={locale === 'fa' ? 'rtl' : 'ltr'}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label={t('thinkingLevel.label')}
              title={t('thinkingLevel.description')}
              className="flex min-h-11 min-w-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-[hsl(var(--surface-elevated))] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] disabled:cursor-not-allowed disabled:opacity-60 data-[state=open]:bg-[hsl(var(--surface-elevated))] data-[state=open]:text-foreground sm:gap-1.5 sm:px-3 sm:text-sm"
            >
              <ChevronDown className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
              <span className="hidden truncate sm:inline">{t(`thinkingLevel.options.${thinkLevel}.title`)}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={10}
            className="w-[19rem] max-w-[calc(100vw-1rem)] rounded-2xl border-menu-border bg-menu p-2 shadow-xl sm:max-w-[calc(100vw-2rem)]"
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

        <button
          type="button"
          aria-pressed={webSearchOn}
          aria-describedby="web-search-hint"
          title={t('webSearch.hint')}
          onClick={() => setWebSearchOn((current) => !current)}
          className={cn(
            'inline-flex h-11 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))]',
            webSearchOn
              ? 'bg-[hsl(var(--surface-elevated))] text-foreground'
              : 'text-muted-foreground hover:bg-[hsl(var(--surface-elevated))] hover:text-foreground'
          )}
        >
          <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="max-w-24 truncate">{t('webSearch.label')}</span>
          <span className="sr-only">{webSearchOn ? t('webSearch.on') : t('webSearch.off')}</span>
        </button>
        <span id="web-search-hint" role="tooltip" className="sr-only">
          {t('webSearch.hint')}
        </span>

        <div
          id="composer-character-counter"
          aria-live="polite"
          className={cn(
            'text-[11px] tabular-nums transition-opacity sm:text-xs',
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
            className="ms-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] active:scale-[0.97]"
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
              'ms-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] active:scale-[0.97]',
              canSend
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'cursor-not-allowed bg-[hsl(var(--surface-elevated))] text-muted-foreground/60'
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
      </div>

      <p id="composer-keyboard-hint" className="sr-only">
        {t('composerKeyboardHint')}
      </p>
    </motion.div>
  );
}
