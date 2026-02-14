'use client';

import {motion} from 'motion/react';
import {Paperclip, SendHorizontal} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useEffect, useRef} from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  search: boolean;
  deepThink: boolean;
  onToggleSearch: () => void;
  onToggleDeepThink: () => void;
  autoFocus?: boolean;
};

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  search,
  deepThink,
  onToggleSearch,
  onToggleDeepThink,
  autoFocus
}: ComposerProps) {
  const t = useTranslations('app');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  return (
    <motion.div
      layoutId="chat-composer" // shared layoutId for smooth morph between center and sticky areas
      transition={{duration: 0.22, ease: 'easeOut'}}
      className="mx-auto w-full max-w-[800px] rounded-2xl border border-border bg-card p-2 shadow-soft"
    >
      <TextareaAutosize
        minRows={1}
        maxRows={7}
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
      />

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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleDeepThink}
            className={cn('transition-all duration-200 active:scale-[0.98]', deepThink && 'bg-accent')}
          >
            {t('deepThink')}
          </Button>
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
