'use client';

import {Paperclip, SendHorizontal} from 'lucide-react';
import {useTranslations} from 'next-intl';
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
};

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  search,
  deepThink,
  onToggleSearch,
  onToggleDeepThink
}: ComposerProps) {
  const t = useTranslations('app');

  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-background/95 p-3 backdrop-blur md:p-4">
      <div className="mx-auto max-w-[800px] rounded-2xl border border-border bg-card p-2 shadow-soft">
        <TextareaAutosize
          minRows={1}
          maxRows={7}
          value={value}
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
            <Button type="button" variant="ghost" size="sm" onClick={onToggleSearch} className={cn(search && 'bg-accent')}>
              {t('search')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleDeepThink}
              className={cn(deepThink && 'bg-accent')}
            >
              {t('deepThink')}
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="ضمیمه فایل">
              {/* TODO: Wire file upload flow after backend upload endpoint and constraints are defined. */}
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
          <Button type="button" size="icon" onClick={onSubmit} disabled={disabled || !value.trim()} aria-label={t('send')}>
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
