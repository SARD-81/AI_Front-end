'use client';

import {Copy, Link2, Pencil, RotateCcw, ThumbsDown, ThumbsUp} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

type MessageActionsProps = {
  role: 'user' | 'assistant';
  onCopy: () => void;
  onEdit?: () => void;
  onCopyLink?: () => void;
  onRegenerate?: () => void;
  onLike?: () => void;
  onDislike?: () => void;
  feedbackState?: boolean | null;
  feedbackDisabled?: boolean;
  className?: string;
};

export function MessageActions({
  role,
  onCopy,
  onEdit,
  onCopyLink,
  onRegenerate,
  onLike,
  onDislike,
  feedbackState,
  feedbackDisabled,
  className
}: MessageActionsProps) {
  const t = useTranslations('app');
  const baseClass =
    'h-7 w-7 rounded-md text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95';

  return (
    <div className={cn('mt-1.5 flex items-center gap-1', className)}>
      <Button type="button" variant="ghost" size="icon" className={baseClass} onClick={onCopy} aria-label={t('messageActions.copy')}>
        <Copy className="h-3.5 w-3.5" />
      </Button>

      {role === 'user' ? (
        <>
          <Button type="button" variant="ghost" size="icon" className={baseClass} onClick={onCopyLink} aria-label={t('messageActions.copyLink')}>
            <Link2 className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className={baseClass} onClick={onEdit} aria-label={t('messageActions.edit')}>
            <Pencil className="h-3.5 w-3.5" />
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
            disabled={!onRegenerate}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(baseClass, feedbackState === true ? 'text-emerald-600 hover:text-emerald-700' : undefined)}
            aria-label={t('messageActions.like')}
            disabled={feedbackDisabled}
            onClick={onLike}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(baseClass, feedbackState === false ? 'text-destructive hover:text-destructive' : undefined)}
            aria-label={t('messageActions.dislike')}
            disabled={feedbackDisabled}
            onClick={onDislike}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
