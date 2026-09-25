'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  EllipsisVertical,
  MessageSquarePlus,
  MessageSquareText,
  Search,
  X
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatSearchDialog } from '@/components/sidebar/ChatSearchDialog';
import { useChatActions, useChats, useGroupedChats } from '@/hooks/use-chat-data';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { ChatSummary } from '@/lib/api/chat';
import { cn } from '@/lib/utils';
import { formatDigitsForLocale } from '@/lib/utils/digits';

const MAX_CONVERSATION_TITLE_LENGTH = 100;
const RENAME_COUNTER_THRESHOLD = 90;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ConversationsPanel({
  locale,
  mobileOpen,
  desktopOpen,
  onClose
}: {
  locale: string;
  mobileOpen: boolean;
  desktopOpen: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('app');
  const isNarrow = useMediaQuery('(max-width: 1279px)');
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const chatsQuery = useChats();
  const groups = useGroupedChats(chatsQuery.data);
  const actions = useChatActions();
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
  const [renameChatId, setRenameChatId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);

  const currentChatId = useMemo(() => {
    const match = pathname?.match(/\/chat[s]?\/([^/?#]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const chatsById = useMemo(() => {
    return new Map((chatsQuery.data ?? []).map((chat) => [chat.id, chat] as const));
  }, [chatsQuery.data]);

  const chatGroups = useMemo(
    () => [
      { title: t('today'), ids: groups.today.map((item) => item.id) },
      { title: t('yesterday'), ids: groups.yesterday.map((item) => item.id) },
      { title: t('month'), ids: groups.month.map((item) => item.id) },
      { title: t('older'), ids: groups.older.map((item) => item.id) }
    ],
    [groups.month, groups.older, groups.today, groups.yesterday, t]
  );

  const renameTarget = renameChatId ? chatsById.get(renameChatId) : undefined;
  const deleteTargetTitle = deleteChatId
    ? chatsById.get(deleteChatId)?.title
    : undefined;

  const createNewChat = () => {
    const href = `/${locale}/chat?focus=1`;
    if (pathname === `/${locale}/chat`) router.replace(href);
    else router.push(href);
    if (isNarrow) onClose();
  };

  const closeRenameDialog = () => {
    if (actions.rename.isPending) return;
    setRenameChatId(null);
    setRenameTitle('');
    setRenameError(null);
  };

  const commitRename = async () => {
    if (!renameTarget) return;
    const title = renameTitle.trim();
    if (!title) {
      setRenameError(t('sidebar.renameTitleRequired'));
      return;
    }
    if (title.length > MAX_CONVERSATION_TITLE_LENGTH) {
      setRenameError(
        t('sidebar.renameTitleTooLong', { max: MAX_CONVERSATION_TITLE_LENGTH })
      );
      return;
    }
    if (title === renameTarget.title.trim()) {
      closeRenameDialog();
      return;
    }
    try {
      await actions.rename.mutateAsync({ chatId: renameTarget.id, title });
      setRenameChatId(null);
      setRenameTitle('');
      setRenameError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('sidebar.renameError');
      setRenameError(message);
      toast.error(message);
    }
  };

  const handleDeleteConversation = async () => {
    if (!deleteChatId) return;
    try {
      await actions.remove.mutateAsync(deleteChatId);
      setDeleteChatId(null);
      if (currentChatId !== deleteChatId) return;
      const remainingChats =
        (queryClient.getQueryData(['chats']) as { id: string }[] | undefined) ??
        [];
      const nextChatId = remainingChats[0]?.id;
      router.replace(
        nextChatId ? `/${locale}/chat/${nextChatId}` : `/${locale}/chat?focus=1`
      );
      if (isNarrow) onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('sidebar.deleteError'));
    }
  };

  return (
    <>
      <aside
        id="conversations-panel"
        aria-label={t('conversations.label')}
        aria-hidden={isNarrow && !mobileOpen}
        ref={(node) => {
          if (!node) return;
          if (isNarrow && !mobileOpen) node.setAttribute('inert', '');
          else node.removeAttribute('inert');
        }}
        className={cn(
          'flex min-h-0 flex-col border border-[hsl(var(--border))] bg-[hsl(var(--surface-card)/0.96)] text-foreground shadow-[0_18px_40px_-28px_rgba(4,72,101,0.55)]',
          'fixed inset-y-0 left-0 z-40 w-[min(88vw,20rem)] pt-[env(safe-area-inset-top)] transition-transform duration-200 motion-reduce:transition-none',
          'xl:static xl:z-0 xl:m-3 xl:h-[calc(100%-1.5rem)] xl:w-[18.5rem] xl:translate-x-0 xl:rounded-2xl xl:pt-0',
          mobileOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-full xl:pointer-events-auto',
          !desktopOpen && 'xl:pointer-events-none xl:m-0 xl:w-0 xl:overflow-hidden xl:border-0 xl:opacity-0'
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <h2 className="min-w-0 flex-1 truncate text-sm font-bold">
            {t('conversations.label')}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t('conversations.close')}
            className="h-11 w-11 shrink-0 xl:inline-flex"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-2 px-3 py-3">
          <button
            type="button"
            onClick={createNewChat}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-primary/80"
          >
            <MessageSquarePlus className="h-5 w-5 shrink-0" />
            <span className="truncate">{t('newChat')}</span>
          </button>
          <button
            type="button"
            onClick={() => setChatSearchOpen(true)}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-border bg-[hsl(var(--surface-elevated))] px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">{t('sidebar.searchPlaceholder')}</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2 pb-3">
          {chatsQuery.isLoading ? (
            <div className="space-y-2 px-2" aria-hidden="true">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-11/12" />
            </div>
          ) : chatsQuery.isError ? (
            <div className="space-y-2 px-2">
              <p role="alert" className="text-sm leading-6 text-muted-foreground">
                {t('sidebar.loadError')}
              </p>
              <Button type="button" size="sm" onClick={() => chatsQuery.refetch()}>
                {t('sidebar.retry')}
              </Button>
            </div>
          ) : (chatsQuery.data?.length ?? 0) === 0 ? (
            <p className="px-2 text-sm leading-6 text-muted-foreground">
              {t('sidebar.emptyHistory')}
            </p>
          ) : (
            chatGroups.map((group) => {
              if (!group.ids.length) return null;
              return (
                <section key={group.title} className="space-y-1">
                  <h3 className="px-2 pt-2 text-xs font-bold text-muted-foreground">
                    {group.title}
                  </h3>
                  {group.ids.map((id) => {
                    const chat = chatsById.get(id);
                    if (!chat) return null;
                    const href = `/${locale}/chat/${chat.id}`;
                    const isActive = pathname === href || openMenuChatId === chat.id;
                    const canRename =
                      UUID_PATTERN.test(chat.id) && Boolean(chat.title.trim());
                    return (
                      <ConversationRow
                        key={chat.id}
                        chat={chat}
                        href={href}
                        isActive={isActive}
                        canRename={canRename}
                        optionsLabel={t('sidebar.chatOptions')}
                        renameLabel={t('rename')}
                        deleteLabel={t('delete')}
                        onOpenMenu={(menuOpen) =>
                          setOpenMenuChatId(menuOpen ? chat.id : null)
                        }
                        onNavigate={() => {
                          if (isNarrow) onClose();
                        }}
                        onRename={() => {
                          setRenameChatId(chat.id);
                          setRenameTitle(chat.title);
                          setRenameError(null);
                        }}
                        onDelete={() => setDeleteChatId(chat.id)}
                      />
                    );
                  })}
                </section>
              );
            })
          )}
        </div>
      </aside>

      <ChatSearchDialog
        open={chatSearchOpen}
        onOpenChange={setChatSearchOpen}
        chats={chatsQuery.data}
        isLoading={chatsQuery.isLoading}
        locale={locale}
        currentChatId={currentChatId}
        onNavigate={() => {
          if (isNarrow) onClose();
        }}
      />

      <Dialog
        open={Boolean(renameChatId)}
        onOpenChange={(next) => {
          if (!next) closeRenameDialog();
        }}
      >
        <DialogContent className="max-w-sm" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
          <DialogTitle>{t('sidebar.renameDialogTitle')}</DialogTitle>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void commitRename();
            }}
          >
            <label htmlFor="rename-conversation-title" className="text-sm font-medium">
              {t('sidebar.renameInput')}
            </label>
            <input
              id="rename-conversation-title"
              value={renameTitle}
              maxLength={MAX_CONVERSATION_TITLE_LENGTH}
              onChange={(event) => {
                setRenameTitle(event.target.value);
                setRenameError(null);
              }}
              aria-invalid={Boolean(renameError)}
              className="h-10 w-full rounded-md border border-[hsl(var(--field-border))] bg-[hsl(var(--field))] px-3 text-sm"
            />
            <div className="flex justify-between text-xs">
              <span className="text-danger-text">{renameError}</span>
              {renameTitle.length > RENAME_COUNTER_THRESHOLD ? (
                <span dir="ltr">
                  {formatDigitsForLocale(renameTitle.length, locale)} /{' '}
                  {formatDigitsForLocale(MAX_CONVERSATION_TITLE_LENGTH, locale)}
                </span>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeRenameDialog}>
                {t('sidebar.cancelRename')}
              </Button>
              <Button type="submit" disabled={actions.rename.isPending}>
                {actions.rename.isPending
                  ? t('sidebar.savingRename')
                  : t('sidebar.saveRename')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteChatId)}
        onOpenChange={(next) => {
          if (!actions.remove.isPending) setDeleteChatId(next ? deleteChatId : null);
        }}
      >
        <DialogContent className="max-w-sm" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
          <DialogTitle>{t('sidebar.deleteConfirmTitle')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('sidebar.deleteConfirmDescription', {
              title: deleteTargetTitle ?? t('chat.defaultTitle')
            })}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteChatId(null)}>
              {t('sidebar.cancelDelete')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConversation}
              disabled={actions.remove.isPending}
            >
              {actions.remove.isPending ? t('sidebar.deleting') : t('sidebar.confirmDelete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConversationRow({
  chat,
  href,
  isActive,
  canRename,
  optionsLabel,
  renameLabel,
  deleteLabel,
  onOpenMenu,
  onNavigate,
  onRename,
  onDelete
}: {
  chat: ChatSummary;
  href: string;
  isActive: boolean;
  canRename: boolean;
  optionsLabel: string;
  renameLabel: string;
  deleteLabel: string;
  onOpenMenu: (open: boolean) => void;
  onNavigate: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      className={cn(
        'rounded-xl pe-1 ps-2 hover:bg-accent',
        isActive && 'bg-accent font-semibold text-accent-foreground'
      )}
    >
      <div className="flex min-h-11 items-center gap-1">
        <Link
          href={href}
          title={chat.title}
          onClick={onNavigate}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-current={isActive ? 'page' : undefined}
        >
          <MessageSquareText className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
          <span className="truncate text-[13px] leading-6">{chat.title}</span>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          aria-label={optionsLabel}
          aria-expanded={menuOpen}
          onClick={() => {
            const next = !menuOpen;
            setMenuOpen(next);
            onOpenMenu(next);
          }}
        >
          <EllipsisVertical className="h-4 w-4" />
        </Button>
      </div>
      {menuOpen ? (
        <div role="menu" className="mb-1 flex flex-col gap-1 pb-1">
          {canRename ? (
            <button
              type="button"
              role="menuitem"
              className="min-h-11 rounded-lg px-3 text-start text-sm hover:bg-background"
              onClick={onRename}
            >
              {renameLabel}
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="min-h-11 rounded-lg px-3 text-start text-sm text-danger-text hover:bg-danger-surface"
            onClick={onDelete}
          >
            {deleteLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
