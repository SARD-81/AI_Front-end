'use client';

import {motion} from 'motion/react';
import {Paperclip, SendHorizontal} from 'lucide-react';
import {useTranslations} from 'next-intl';
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

const THINKING_LEVEL_OPTIONS: Array<{value: ThinkingLevel; title: string; subtitle: string}> = [
  {
    value: 'standard',
    title: 'استاندارد',
    subtitle: 'پاسخ سریع و مستقیم بدون تحلیل اضافی.'
  },
  {
    value: 'low',
    title: 'تفکر ساده (Low)',
    subtitle: 'پاسخ‌های سریع با حداقل تفکر داخلی.'
  },
  {
    value: 'medium',
    title: 'تفکر متعادل (Medium)',
    subtitle: 'تعادل بین سرعت و عمق.'
  },
  {
    value: 'high',
    title: 'تفکر عمیق (High)',
    subtitle: 'تحلیل دقیق و مفصل با صرف زمان بیشتر و بر اساس زنجیره تفکر کامل‌تر.'
  }
];

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (focusTrigger === undefined) return;
    textareaRef.current?.focus();
  }, [focusTrigger]);

  const selectedLevel = THINKING_LEVEL_OPTIONS.find((option) => option.value === thinkingLevel) ?? THINKING_LEVEL_OPTIONS[0];

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
        className="max-h-40 w-full resize-none bg-transparent px-2 py-2 text-[15px] leading-7 outline-none placeholder:text-muted-foreground"
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
          {MAX_MESSAGE_LENGTH} / {value.length}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleSearch}
            className={cn('transition-all duration-200 active:scale-[0.98]', search && 'bg-accent')}
          >
            {t('search')}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="transition-all duration-200 active:scale-[0.98]">
                <span>سطح تفکر</span>
                <span className="text-muted-foreground">{selectedLevel.title}</span>
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
                <div className="space-y-1" dir="rtl">
                  {THINKING_LEVEL_OPTIONS.map((option) => {
                    const isSelected = option.value === thinkingLevel;
                    return (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                        className={cn(
                          'w-full items-start rounded-xl border p-3 text-right focus:text-foreground',
                          'hover:bg-accent/60',
                          isSelected ? 'border-primary bg-primary/10' : 'border-border bg-background'
                        )}
                      >
                        <div className="w-full pr-5">
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
            aria-label="ضمیمه فایل"
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
          className="transition-all duration-200 active:scale-[0.98]"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
