'use client';

import {motion} from 'motion/react';
import {Paperclip, SendHorizontal} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useRef} from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

const MAX_MESSAGE_LENGTH = 2500;

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  focusTrigger?: number;
};

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  autoFocus,
  focusTrigger
}: ComposerProps) {
  const t = useTranslations('app');
  const locale = useLocale();
  const comingSoonLabel = locale === 'fa' ? 'به‌زودی' : 'Coming soon';
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
      className="mx-auto w-full max-w-[800px] rounded-2xl border border-border bg-card p-2 shadow-soft"
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
        className="max-h-40 w-full resize-none bg-transparent px-2 py-2 text-[15px] leading-7 outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              ? 'border-border bg-muted text-muted-foreground opacity-100'
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
            className="cursor-not-allowed border border-dashed border-border bg-muted/60 text-muted-foreground opacity-80"
          >
            <span>{t('search')}</span>
            <span className="text-xs text-muted-foreground">{comingSoonLabel}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled
            aria-disabled="true"
            title={t('thinkingLevel.futureHint')}
            className="cursor-not-allowed border border-dashed border-border bg-muted/60 text-muted-foreground opacity-80"
          >
            <span>{t('thinkingLevel.label')}</span>
            <span className="text-xs text-muted-foreground">{comingSoonLabel}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('attachment.label')}
            title={t('attachment.notAvailableYet')}
            disabled={true}
            className="cursor-not-allowed border border-dashed border-border bg-muted/60 text-muted-foreground opacity-80"
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
