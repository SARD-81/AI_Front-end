'use client';

import {motion} from 'motion/react';
import {Paperclip, SendHorizontal} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useRef} from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import {Button} from '@/components/ui/button';
import type {ThinkingLevel} from '@/lib/api/chat';
import {cn} from '@/lib/utils';

const MAX_MESSAGE_LENGTH = 2500;

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
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
  autoFocus,
  focusTrigger,
  thinkLevel,
  onThinkLevelChange
}: ComposerProps) {
  const t = useTranslations('app');
  const locale = useLocale();
  const comingSoonLabel = locale === 'fa' ? 'به‌زودی' : 'Coming soon';
  const thinkingLevels: ThinkingLevel[] = ['low', 'medium', 'high'];
  const characterCount = value.length;
  const showCharacterCounter = characterCount > MAX_MESSAGE_LENGTH * 0.8;
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
      className="mx-auto w-full max-w-[800px] rounded-2xl border border-[hsl(var(--field-border))] bg-[hsl(var(--surface-card))] p-2 shadow-card"
    >
      <TextareaAutosize
        minRows={1}
        maxRows={7}
        maxLength={MAX_MESSAGE_LENGTH}
        value={value}
        ref={textareaRef}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('composerPlaceholder')}
        disabled={disabled}
        className="max-h-40 w-full resize-none rounded-xl border border-[hsl(var(--field-border))] bg-[hsl(var(--field))] px-3 py-2 text-[15px] leading-7 text-[hsl(var(--field-foreground))] outline-none ring-offset-background placeholder:text-[hsl(var(--field-placeholder))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
        aria-label={t('composerPlaceholder')}
        aria-describedby="composer-keyboard-hint composer-character-counter"
      />

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 px-2">
        <p id="composer-keyboard-hint" className="text-xs leading-5 text-muted-foreground/80">
          {t('composerKeyboardHint')}
        </p>
        <div
          id="composer-character-counter"
          aria-live="polite"
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-xs transition-opacity',
            showCharacterCounter
              ? 'border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-elevated))] text-muted-foreground opacity-100'
              : 'border-transparent text-muted-foreground/60 opacity-70'
          )}
        >
          {characterCount} / {MAX_MESSAGE_LENGTH}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled
            aria-disabled="true"
            title={t('searchDisabledHint')}
            className="cursor-not-allowed border border-dashed border-[hsl(var(--field-border))] bg-[hsl(var(--surface-elevated))] text-muted-foreground opacity-80"
          >
            <span>{t('search')}</span>
            <span className="text-xs text-muted-foreground">{comingSoonLabel}</span>
          </Button>

          <label className="flex min-w-0 items-center gap-2 rounded-md border border-[hsl(var(--field-border))] bg-[hsl(var(--field))] px-2.5 py-1.5 text-sm text-[hsl(var(--field-foreground))] shadow-sm">
            <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">
              {t('thinkingLevel.label')}
            </span>
            <select
              value={thinkLevel}
              onChange={(event) =>
                onThinkLevelChange(event.target.value as ThinkingLevel)
              }
              disabled={disabled}
              aria-label={t('thinkingLevel.label')}
              title={t('thinkingLevel.description')}
              className="max-w-[150px] bg-transparent text-xs font-medium outline-none disabled:cursor-not-allowed disabled:text-muted-foreground sm:max-w-none"
            >
              {thinkingLevels.map((level) => (
                <option key={level} value={level}>
                  {t(`thinkingLevel.options.${level}.title`)}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('attachment.label')}
            title={t('attachment.notAvailableYet')}
            disabled={true}
            className="cursor-not-allowed border border-dashed border-[hsl(var(--field-border))] bg-[hsl(var(--surface-elevated))] text-muted-foreground opacity-80"
          >
            {/* TODO(BACKEND): add upload endpoint integration and file constraints for attachments. */}
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          size="icon"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          aria-label={t('send')}
          title={t('send')}
          className="ms-auto shrink-0 transition-all duration-200 active:scale-[0.98]"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
