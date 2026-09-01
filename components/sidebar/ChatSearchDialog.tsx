'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChatSummary } from '@/lib/api/chat';
import { cn } from '@/lib/utils';

type ChatSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chats: ChatSummary[] | undefined;
  isLoading?: boolean;
  locale: string;
  currentChatId?: string | null;
  onNavigate?: () => void;
};

export function ChatSearchDialog({
  open,
  onOpenChange,
  chats,
  isLoading,
  locale,
  currentChatId,
  onNavigate
}: ChatSearchDialogProps) {
  const t = useTranslations('app');
  const router = useRouter();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(() => {
    const list = chats ?? [];
    if (!normalizedQuery) return list;
    return list.filter((chat) =>
      (chat.title ?? '').toLowerCase().includes(normalizedQuery)
    );
  }, [chats, normalizedQuery]);

  const openChat = (chatId: string) => {
    onOpenChange(false);
    router.push(`/${locale}/chat/${chatId}`);
    onNavigate?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={locale === 'fa' ? 'rtl' : 'ltr'}
        className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0 pe-0 sm:max-h-[min(44rem,calc(100dvh-3rem))] sm:w-full sm:max-w-xl"
      >
        <DialogTitle className="sr-only">
          {t('sidebar.searchDialogTitle')}
        </DialogTitle>

        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3.5 sm:px-5 sm:py-4">
          <Search
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('sidebar.searchPlaceholder')}
            aria-label={t('sidebar.searchPlaceholder')}
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 w-full border-0 bg-transparent text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:outline-none focus-visible:ring-0 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-py-2 px-2 py-3 sm:min-h-[8rem]">
          <p className="px-3 pb-2 text-xs font-medium text-muted-foreground">
            {normalizedQuery
              ? t('sidebar.searchResults')
              : t('sidebar.recentChats')}
          </p>

          {isLoading ? (
            <div className="space-y-2 px-3 py-1" aria-hidden="true">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-11/12" />
              <Skeleton className="h-8 w-10/12" />
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {normalizedQuery
                ? t('sidebar.noSearchResults')
                : t('sidebar.emptyHistory')}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {results.map((chat) => (
                <li key={chat.id}>
                  <button
                    type="button"
                    onClick={() => openChat(chat.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm text-foreground transition-colors hover:bg-[hsl(var(--surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))]',
                      chat.id === currentChatId &&
                        'bg-[hsl(var(--surface-elevated))] font-medium'
                    )}
                  >
                    <MessageCircle
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {chat.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
