'use client';

import {motion} from 'motion/react';
import {Paperclip, SendHorizontal} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useRef} from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import {Button} from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type {ThinkingLevel} from '@/lib/api/chat';
import {cn} from '@/lib/utils';

const MAX_MESSAGE_LENGTH = 2500;

const THINKING_LEVEL_VALUES: ThinkingLevel[] = ['standard', 'low', 'medium', 'high'];

type ComposerProps = {
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
};

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  search,
  thinkingLevel,
  onToggleSearch,
  onThinkingLevelChange,
  autoFocus,
  focusTrigger
}: ComposerProps) {
  const t = useTranslations('app');
  const locale = useLocale();
  const isRtl = locale === 'fa';
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (focusTrigger === undefined) return;
    textareaRef.current?.focus();
  }, [focusTrigger]);

  const thinkingLevelOptions = THINKING_LEVEL_VALUES.map((level) => ({
    value: level,
    title: t(`thinkingLevel.options.${level}.title`),
    subtitle: t(`thinkingLevel.options.${level}.subtitle`)
  }));
  const selectedLevel = thinkingLevelOptions.find((option) => option.value === thinkingLevel) ?? thinkingLevelOptions[0];

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
        aria-describedby="composer-character-counter"
      />

      <div className="mt-1 flex justify-end px-2">
        <div
          id="composer-character-counter"
          aria-live="polite"
          className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
        >
          {value.length} / {MAX_MESSAGE_LENGTH}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleSearch}
            aria-pressed={search}
            title={search ? t('searchEnabledHint') : t('searchDisabledHint')}
            className={cn('transition-all duration-200 active:scale-[0.98]', search && 'bg-accent')}
          >
            {t('search')}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title={t('thinkingLevel.futureHint')}
                className="transition-all duration-200 active:scale-[0.98]"
              >
                <span>{t('thinkingLevel.label')} :</span>
                <span className={cn('text-muted-foreground', isRtl ? 'mr-3' : 'ml-3')}>{selectedLevel.title}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-[min(520px,calc(100vw-24px))] min-w-[min(420px,calc(100vw-24px))] p-2"
            >
              <DropdownMenuRadioGroup
                value={thinkingLevel}
                onValueChange={(nextValue) => onThinkingLevelChange(nextValue as ThinkingLevel)}
              >
                <div className="space-y-1" dir={isRtl ? 'rtl' : 'ltr'}>
                  {thinkingLevelOptions.map((option) => {
                    const isSelected = option.value === thinkingLevel;
                    return (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                        className={cn(
                          'w-full items-start rounded-xl border p-3 focus:text-foreground',
                          isRtl ? 'text-right' : 'text-left',
                          'hover:bg-accent',
                          isSelected ? 'border-primary/50 bg-accent' : 'border-border bg-background'
                        )}
                      >
                        <div className={cn('w-full', isRtl ? 'pr-5' : 'pl-5')}>
                          <p className="text-sm font-semibold text-foreground">{option.title}</p>
                          <p className="mt-1 text-xs leading-6 text-muted-foreground">{option.subtitle}</p>
                        </div>
                      </DropdownMenuRadioItem>
                    );
                  })}
                </div>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('attachment.label')}
            title={t('attachment.notAvailableYet')}
            disabled={true}
            className="transition-all duration-200 active:scale-[0.98]"
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
          className="transition-all duration-200 active:scale-[0.98]"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
