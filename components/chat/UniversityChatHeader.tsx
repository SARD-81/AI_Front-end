'use client';

import { MessagesSquare, PanelsTopLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { UniversityLogo } from '@/components/branding/UniversityLogo';
import { Button } from '@/components/ui/button';

export function UniversityChatHeader({
  locale,
  chatTitle,
  compact,
  onOpenServices,
  onOpenConversations
}: {
  locale: string;
  chatTitle?: string;
  compact: boolean;
  onOpenServices: () => void;
  onOpenConversations: () => void;
}) {
  const t = useTranslations('app');
  const isRtl = locale === 'fa';
  const servicesButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-11 w-11 shrink-0 md:hidden"
      aria-label={t('services.open')}
      aria-controls="services-panel"
      onClick={onOpenServices}
    >
      <PanelsTopLeft className="h-5 w-5" />
    </Button>
  );
  const conversationsButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-11 w-11 shrink-0"
      aria-label={t('conversations.open')}
      aria-controls="conversations-panel"
      onClick={onOpenConversations}
    >
      <MessagesSquare className="h-5 w-5" />
    </Button>
  );

  const identity = (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-1 sm:gap-3">
      <UniversityLogo
        alt={t('sidebar.logoAlt')}
        className={compact ? 'h-9 w-9' : 'h-11 w-11 sm:h-14 sm:w-14'}
      />
      <div className="min-w-0 text-start">
        <p className="font-display-fa text-lg leading-7 text-foreground sm:text-xl">
          {t('chatHeader.productName')}
        </p>
        {compact && chatTitle ? (
          <p className="truncate text-xs font-medium leading-5 text-muted-foreground sm:text-sm">
            {chatTitle}
          </p>
        ) : (
          <>
            <p className="truncate text-xs leading-5 text-foreground/80 sm:text-sm">
              {t('chatHeader.subtitle')}
            </p>
            {compact ? null : (
              <p className="line-clamp-2 text-[11px] leading-4 text-muted-foreground sm:text-xs sm:leading-5">
                {t('chatHeader.facultyAccess')}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <header className="shrink-0 border-b border-[hsl(var(--border)/0.8)] bg-[hsl(var(--surface-card)/0.9)] px-2 py-2 backdrop-blur sm:px-4">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-1">
        {isRtl ? (
          <>
            {servicesButton}
            {identity}
            {conversationsButton}
          </>
        ) : (
          <>
            {conversationsButton}
            {identity}
            {servicesButton}
          </>
        )}
      </div>
    </header>
  );
}
