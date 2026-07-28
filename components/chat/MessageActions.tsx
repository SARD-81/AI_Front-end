'use client';

import {Copy, Pencil, RotateCcw, ThumbsDown, ThumbsUp} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

type MessageActionsProps = {
  role: 'user' | 'assistant';
  onCopy: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onLike?: () => void;
  onDislike?: () => void;
  feedbackState?: boolean | null;
  feedbackDisabled?: boolean;
  timeLabel?: string;
  dateTime?: string;
  className?: string;
};

export function MessageActions({
  role,
  onCopy,
  onEdit,
  onRegenerate,
  onLike,
  onDislike,
  feedbackState,
  feedbackDisabled,
  timeLabel,
  dateTime,
  className
}: MessageActionsProps) {
  const t = useTranslations('app');
  // Slightly bigger hit area, softer hover surface and a calmer easing so
  // the row does not 'pop' the moment the pointer crosses the bubble.
  const baseClass =
    'h-8 w-8 rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-[hsl(var(--surface-elevated))] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97]';

  return (
    <div className={cn('mt-1 flex items-center gap-0.5', className)}>
      <Button type="button" variant="ghost" size="icon" className={baseClass} onClick={onCopy} aria-label={t('messageActions.copy')} title={t('messageActions.copy')}>
        <Copy className="h-4 w-4" />
      </Button>

      {role === 'user' ? (
        <>
          <Button type="button" variant="ghost" size="icon" className={baseClass} onClick={onEdit} aria-label={t('messageActions.edit')} title={t('messageActions.edit')}>
            <Pencil className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={baseClass}
            onClick={onRegenerate}
            aria-label={t('messageActions.regenerate')}
            title={t('messageActions.regenerate')}
            disabled={!onRegenerate}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(baseClass, feedbackState === true ? 'text-emerald-600 hover:text-emerald-700' : undefined)}
            aria-label={t('messageActions.like')}
            title={t('messageActions.like')}
            aria-pressed={feedbackState === true}
            disabled={feedbackDisabled}
            onClick={onLike}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(baseClass, feedbackState === false ? 'text-destructive hover:text-destructive' : undefined)}
            aria-label={t('messageActions.dislike')}
            title={t('messageActions.dislike')}
            aria-pressed={feedbackState === false}
            disabled={feedbackDisabled}
            onClick={onDislike}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* The clock used to sit on its own line and collided with the
          buttons; it is now the last chip of the same row. */}
      {timeLabel ? (
        <time dateTime={dateTime} className="px-1 text-[11px] tabular-nums text-muted-foreground/70">
          {timeLabel}
        </time>
      ) : null}
    </div>
  );
}
