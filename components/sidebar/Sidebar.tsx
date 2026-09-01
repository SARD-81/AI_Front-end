'use client';

import { LayoutGroup, motion } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PanelLeft,
  EllipsisVertical,
  LogOut,
  MessageCircle,
  MessageSquarePlus,
  Search,
  Settings,
  UserCircle2
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatSearchDialog } from '@/components/sidebar/ChatSearchDialog';
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarHeader
} from '@/components/ui/sidebar';
import {
  useChatActions,
  useChats,
  useGroupedChats
} from '@/hooks/use-chat-data';
import type { ChatSummary } from '@/lib/api/chat';
import dynamic from 'next/dynamic';
import { useAppSettings } from '@/hooks/use-app-settings';
import { getMe, logout } from '@/lib/services/auth-service';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { formatDigitsForLocale } from '@/lib/utils/digits';

const SettingsModal = dynamic(
  () =>
    import('@/components/settings/SettingsModal').then(
      (mod) => mod.SettingsModal
    ),
  { ssr: false }
);

const COLLAPSED_WIDTH = 76;
const EXPANDED_WIDTH = 304;
const MAX_CONVERSATION_TITLE_LENGTH = 100;
const RENAME_COUNTER_THRESHOLD = 90;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function Sidebar({
  locale,
  onNavigate
}: {
  locale: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations('app');
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: getMe,
    staleTime: 60_000,
    retry: false
  });
  const chatsQuery = useChats();
  // Conversation search now lives in a ChatGPT-style command dialog instead of
  // an always-visible input inside the sidebar.
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const groups = useGroupedChats(chatsQuery.data);
  const actions = useChatActions();
  const isRtl = locale === 'fa';

  const currentChatId = useMemo(() => {
    const match = pathname?.match(/\/chat[s]?\/([^/?#]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const [collapsed, setCollapsed] = useState(false);
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null); // keep row selected while menu stays open
  const [renameChatId, setRenameChatId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 1023px)');

  const { settings, setSettings } = useAppSettings();

  useEffect(() => {
    if (isMobile) {
      setCollapsed(false);
      return;
    }

    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored) setCollapsed(stored === 'true'); // localStorage persistence for collapse state
  }, [isMobile]);

  const toggleCollapsed = () => {
    if (isMobile) return;

    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const createNewChat = () => {
    const href = `/${locale}/chat?focus=1`;

    if (pathname === `/${locale}/chat`) {
      router.replace(href);
    } else {
      router.push(href);
    }

    onNavigate?.();
  };

  const isSafeBackendRenameMessage = (message: string) => {
    const normalizedMessage = message.trim();

    return (
      normalizedMessage.length > 0 &&
      normalizedMessage.length <= 160 &&
      !/[<>]/.test(normalizedMessage)
    );
  };

  const isRenameLimitError = (message: string) =>
    /limit|rate|quota|too many|maximum|exceed/i.test(message);

  const openRenameDialog = (chat: ChatSummary) => {
    setRenameChatId(chat.id);
    setRenameTitle(chat.title);
    setRenameError(null);
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
      const backendMessage = error instanceof Error ? error.message : '';
      const message =
        backendMessage && isRenameLimitError(backendMessage)
          ? isSafeBackendRenameMessage(backendMessage)
            ? backendMessage
            : t('sidebar.renameLimitError')
          : backendMessage || t('sidebar.renameError');

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

      if (nextChatId) {
        router.replace(`/${locale}/chat/${nextChatId}`);
        onNavigate?.();
        return;
      }

      // Do not persist a replacement conversation after deleting the last one.
      // The empty shell remains virtual until the user submits a real message.
      router.replace(`/${locale}/chat?focus=1`);
      onNavigate?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('sidebar.deleteError');
      toast.error(message);
    }
  };

  const chatGroups = useMemo(
    () => [
      { title: t('today'), ids: groups.today.map((item) => item.id) },
      { title: t('month'), ids: groups.month.map((item) => item.id) },
      { title: t('older'), ids: groups.older.map((item) => item.id) }
    ],
    [groups.month, groups.older, groups.today, t]
  );

  const chatsById = useMemo(() => {
    const entries = (chatsQuery.data ?? []).map(
      (chat) => [chat.id, chat] as const
    );
    return new Map(entries);
  }, [chatsQuery.data]);

  const hasChats = (chatsQuery.data?.length ?? 0) > 0;
  const deleteTargetTitle = deleteChatId
    ? chatsById.get(deleteChatId)?.title
    : undefined;
  const renameTarget = renameChatId ? chatsById.get(renameChatId) : undefined;

  const user = profileQuery.data?.user;
  const fullName = user?.fullName?.trim();
  const firstLastName =
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const rawProfileName =
    fullName || firstLastName || user?.studentId || t('sidebar.guestUser');
  const rawProfileSubtitle =
    user?.email || user?.studentId || t('sidebar.demoVersion');
  const profileName = formatDigitsForLocale(rawProfileName, locale);
  const profileSubtitle = formatDigitsForLocale(rawProfileSubtitle, locale);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Continue local logout cleanup even if the backend request fails.
    } finally {
      localStorage.removeItem('sidebar-collapsed');
      queryClient.clear();
      router.replace(`/${locale}/auth?mode=login`);
      onNavigate?.();
    }
  };

  return (
    <LayoutGroup>
      <motion.div
        layout
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="h-full"
        style={{
          width: isMobile
            ? EXPANDED_WIDTH
            : collapsed
              ? COLLAPSED_WIDTH
              : EXPANDED_WIDTH
        }}
      >
        <SidebarRoot className="h-full w-full">
          <SidebarHeader
            className={cn(
              'flex flex-col gap-1 border-b-0 px-3 py-3',
              collapsed && 'items-center px-2'
            )}
          >
            {/* Brand row + collapse control, like ChatGPT's top rail. */}
            <div
              className={cn(
                'flex items-center gap-1',
                collapsed && 'flex-col gap-1.5'
              )}
            >
              <Link
                href={`/${locale}`}
                aria-label={t('sidebar.home')}
                onClick={onNavigate}
                className={cn(
                  'flex h-10 items-center rounded-lg text-primary transition-colors hover:bg-[hsl(var(--surface-elevated))]',
                  collapsed ? 'w-10 justify-center' : 'min-w-0 flex-1 gap-2 px-1.5'
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white p-1 ring-1 ring-black/5 dark:bg-white dark:ring-white/25">
                  <Image
                    src="/Logo.png"
                    alt={t('sidebar.logoAlt')}
                    width={32}
                    height={32}
                    className="h-full w-full object-contain"
                  />
                </span>
                {!collapsed ? (
                  <span className="truncate text-sm font-semibold text-foreground">
                    {t('sidebar.universityName')}
                  </span>
                ) : null}
              </Link>

              {!isMobile ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleCollapsed}
                  aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
                  title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
                  className="h-10 w-10 shrink-0 rounded-lg text-muted-foreground hover:bg-[hsl(var(--surface-elevated))] hover:text-foreground"
                >
                  <PanelLeft className="h-[1.15rem] w-[1.15rem]" />
                </Button>
              ) : null}
            </div>

            {/* Primary actions as quiet rail rows (new chat + search). */}
            <nav className={cn('mt-1 flex flex-col gap-0.5', collapsed && 'items-center')}>
              <button
                type="button"
                onClick={createNewChat}
                aria-label={t('newChat')}
                title={collapsed ? t('newChat') : undefined}
                className={cn(
                  'flex h-10 items-center rounded-lg text-sm font-medium text-foreground transition-colors hover:bg-[hsl(var(--surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))]',
                  collapsed ? 'w-10 justify-center' : 'w-full gap-3 px-2'
                )}
              >
                <MessageSquarePlus className="h-[1.15rem] w-[1.15rem] shrink-0" />
                {!collapsed ? <span className="truncate">{t('newChat')}</span> : null}
              </button>

              <button
                type="button"
                onClick={() => setChatSearchOpen(true)}
                aria-label={t('sidebar.searchPlaceholder')}
                title={collapsed ? t('sidebar.searchPlaceholder') : undefined}
                className={cn(
                  'flex h-10 items-center rounded-lg text-sm font-medium text-foreground transition-colors hover:bg-[hsl(var(--surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))]',
                  collapsed ? 'w-10 justify-center' : 'w-full gap-3 px-2'
                )}
              >
                <Search className="h-[1.15rem] w-[1.15rem] shrink-0" />
                {!collapsed ? (
                  <span className="truncate">{t('sidebar.searchPlaceholder')}</span>
                ) : null}
              </button>
            </nav>
          </SidebarHeader>

          <SidebarContent
            className={cn('space-y-3 px-2', collapsed && 'hidden')}
          >
            {chatsQuery.isLoading ? (
              <div className="space-y-3 px-1" aria-hidden="true">
                <Skeleton className="h-3.5 w-16" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-11/12" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-10/12" />
                  <Skeleton className="h-8 w-9/12" />
                </div>
              </div>
            ) : chatsQuery.isError ? (
              <div
                className={cn(
                  'space-y-2 px-2 py-3',
                  collapsed && 'px-1 text-center'
                )}
              >
                {!collapsed ? (
                  <p className="text-xs text-muted-foreground">
                    {t('sidebar.loadError')}
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size={collapsed ? 'icon' : 'sm'}
                  onClick={() => chatsQuery.refetch()}
                  className={cn('h-8', !collapsed && 'w-full justify-start')}
                  aria-label={t('sidebar.retry')}
                  title={collapsed ? t('sidebar.retry') : undefined}
                >
                  {collapsed ? (
                    <MessageCircle className="h-4 w-4" />
                  ) : (
                    t('sidebar.retry')
                  )}
                </Button>
              </div>
            ) : !hasChats ? (
              <div className={cn('px-2 py-3', collapsed && 'px-1 text-center')}>
                {!collapsed ? (
                  <p className="text-xs text-muted-foreground">
                    {t('sidebar.emptyHistory')}
                  </p>
                ) : null}
              </div>
            ) : (
              chatGroups.map((group) => {
                if (!group.ids.length) return null;
                return (
                  <section key={group.title} className="space-y-1">
                    {!collapsed ? (
                      <p className="px-2 pb-1 pt-3 text-xs font-medium text-muted-foreground">
                        {group.title}
                      </p>
                    ) : null}
                    {group.ids.map((id) => {
                      const chat = chatsById.get(id);
                      if (!chat) return null;

                      const href = `/${locale}/chat/${chat.id}`;
                      const isActive =
                        pathname === href || openMenuChatId === chat.id;
                      const canRenameConversation =
                        UUID_PATTERN.test(chat.id) &&
                        Boolean(chat.title.trim());

                      return (
                        <motion.div layout key={chat.id} className="group">
                          <div
                            className={cn(
                              'flex items-center gap-2 rounded-lg px-2 py-2 text-foreground transition-colors duration-150 hover:bg-[hsl(var(--surface-elevated))]',
                              isActive &&
                                'bg-[hsl(var(--surface-elevated))] font-medium text-foreground'
                            )}
                          >
                            <Link
                              href={href}
                              className={cn(
                                'flex min-w-0 flex-1 items-center gap-2',
                                collapsed && 'justify-center'
                              )}
                              onClick={onNavigate}
                              title={collapsed ? chat.title : undefined}
                            >
                              {!collapsed ? (
                                <span className="truncate text-sm">
                                  {chat.title}
                                </span>
                              ) : (
                                <MessageCircle className="h-4 w-4 shrink-0" />
                              )}
                            </Link>

                            <DropdownMenu
                              onOpenChange={(open) =>
                                setOpenMenuChatId(open ? chat.id : null)
                              }
                            >
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    'h-7 w-7 transition-opacity duration-150 active:scale-[0.98]',
                                    collapsed
                                      ? 'opacity-100'
                                      : 'opacity-0 group-hover:opacity-100',
                                    isActive && 'opacity-100'
                                  )}
                                  aria-label={t('sidebar.chatOptions')}
                                >
                                  <EllipsisVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="start"
                                side="left"
                                className="border-[hsl(var(--menu-border))] bg-[hsl(var(--menu))] text-[hsl(var(--menu-foreground))] shadow-card"
                              >
                                {canRenameConversation ? (
                                  <DropdownMenuItem
                                    onClick={() => openRenameDialog(chat)}
                                  >
                                    {t('rename')}
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem
                                  className="text-danger-text focus:bg-danger-surface focus:text-danger-text data-[highlighted]:bg-danger-surface data-[highlighted]:text-danger-text"
                                  onClick={() => setDeleteChatId(chat.id)}
                                >
                                  {t('delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </motion.div>
                      );
                    })}
                  </section>
                );
              })
            )}
          </SidebarContent>

          <SidebarFooter>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'group h-11 w-full justify-start gap-2 overflow-hidden border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))] shadow-sm transition-all duration-200 hover:border-[hsl(var(--menu-border))] hover:bg-[hsl(var(--surface-elevated))] hover:shadow-card focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] focus-visible:ring-offset-2 active:scale-[0.99]',
                    collapsed && 'h-10 w-10 justify-center p-0'
                  )}
                  aria-label={t('sidebar.profile')}
                  title={collapsed ? t('sidebar.profile') : undefined}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--menu-border))] bg-[hsl(var(--menu))] text-[hsl(var(--menu-foreground))] shadow-sm transition-transform duration-200 group-hover:scale-105">
                    <UserCircle2 className="h-5 w-5" />
                  </span>
                  {!collapsed ? (
                    <div className="flex min-w-0 flex-col items-start">
                      <span className="truncate text-sm font-medium">
                        {profileName}
                      </span>
                      <span className="max-w-44 truncate text-xs text-muted-foreground">
                        {profileSubtitle}
                      </span>
                    </div>
                  ) : null}
                  {!collapsed ? (
                    <EllipsisVertical className="ms-auto h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:rotate-90 group-hover:text-foreground" />
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={collapsed ? 'center' : 'start'}
                side="left"
                className={cn(
                  'w-72 overflow-hidden rounded-2xl border border-[hsl(var(--menu-border))] bg-[hsl(var(--menu)/0.92)] p-2 text-[hsl(var(--menu-foreground))] shadow-[0_22px_70px_-28px_hsl(var(--shadow-color)/0.75),0_0_0_1px_hsl(var(--foreground)/0.04)] backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                  collapsed && 'w-56',
                  isRtl ? '[direction:rtl]' : '[direction:ltr]'
                )}
              >
                {!collapsed ? (
                  <div className="mb-2 flex items-center gap-3 rounded-xl border border-[hsl(var(--menu-border))] bg-[hsl(var(--surface-elevated)/0.72)] p-3 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--menu-hover))] text-[hsl(var(--menu-hover-foreground))] shadow-inner">
                      <UserCircle2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {profileName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {profileSubtitle}
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="space-y-1">
                  <DropdownMenuItem
                    className="group/item h-11 gap-3 rounded-xl px-3 font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] focus-visible:ring-offset-2 data-[highlighted]:translate-x-0.5 rtl:data-[highlighted]:-translate-x-0.5"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-data-[highlighted]/item:text-[hsl(var(--menu-hover-foreground))]" />
                    <span>{t('sidebar.settings')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="group/item h-11 gap-3 rounded-xl px-3 font-medium text-danger-text transition-all duration-150 focus-visible:ring-2 focus-visible:ring-danger-text/30 focus-visible:ring-offset-2 data-[highlighted]:translate-x-0.5 data-[highlighted]:bg-danger-surface data-[highlighted]:text-danger-text rtl:data-[highlighted]:-translate-x-0.5"
                    onClick={() => setLogoutConfirmOpen(true)}
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span>{t('sidebar.logoutNow')}</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </SidebarRoot>
      </motion.div>

      <ChatSearchDialog
        open={chatSearchOpen}
        onOpenChange={setChatSearchOpen}
        chats={chatsQuery.data}
        isLoading={chatsQuery.isLoading}
        locale={locale}
        currentChatId={currentChatId}
        onNavigate={onNavigate}
      />

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        setSettings={setSettings}
        user={user}
        isUserLoading={profileQuery.isLoading}
        onNavigate={onNavigate}
      />

      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent
          className="!w-[calc(100vw-2rem)] !max-w-sm gap-4 rounded-2xl p-5 pe-10 shadow-card sm:!w-full sm:p-6 sm:pe-12"
          dir={locale === 'fa' ? 'rtl' : 'ltr'}
        >
          <DialogTitle className="text-lg font-semibold leading-7">
            {t('sidebar.logoutConfirmTitle')}
          </DialogTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            {t('sidebar.logoutConfirmDescription')}
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setLogoutConfirmOpen(false)}
            >
              {t('sidebar.cancelLogout')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={handleLogout}
            >
              {t('sidebar.confirmLogout')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(renameChatId)}
        onOpenChange={(open) => {
          if (!open) closeRenameDialog();
        }}
      >
        <DialogContent
          className="max-w-sm"
          dir={locale === 'fa' ? 'rtl' : 'ltr'}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeRenameDialog();
            }
          }}
        >
          <DialogTitle className="text-base font-semibold">
            {t('sidebar.renameDialogTitle')}
          </DialogTitle>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void commitRename();
            }}
          >
            <div className="space-y-2">
              <label
                htmlFor="rename-conversation-title"
                className="text-sm font-medium"
              >
                {t('sidebar.renameInput')}
              </label>
              <input
                id="rename-conversation-title"
                autoFocus
                value={renameTitle}
                maxLength={MAX_CONVERSATION_TITLE_LENGTH}
                onChange={(event) => {
                  setRenameTitle(event.target.value);
                  setRenameError(null);
                }}
                className="h-10 w-full rounded-md border border-[hsl(var(--field-border))] bg-[hsl(var(--field))] px-3 text-sm text-[hsl(var(--field-foreground))] outline-none ring-offset-background focus-visible:border-[hsl(var(--field-focus))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] focus-visible:ring-offset-2"
                aria-invalid={Boolean(renameError)}
                aria-describedby="rename-conversation-help"
              />
              <div
                id="rename-conversation-help"
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="text-danger-text">{renameError}</span>
                {/* Only surfaces the counter when the user approaches the cap. */}
                {renameTitle.length > RENAME_COUNTER_THRESHOLD ? (
                  <span className="ms-auto shrink-0 tabular-nums text-muted-foreground" dir="ltr">
                    {formatDigitsForLocale(renameTitle.length, locale)} /{' '}
                    {formatDigitsForLocale(MAX_CONVERSATION_TITLE_LENGTH, locale)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={closeRenameDialog}
                disabled={actions.rename.isPending}
              >
                {t('sidebar.cancelRename')}
              </Button>
              <Button
                type="submit"
                disabled={
                  actions.rename.isPending ||
                  renameTitle.trim().length > MAX_CONVERSATION_TITLE_LENGTH
                }
              >
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
        onOpenChange={(open) =>
          !actions.remove.isPending &&
          setDeleteChatId(open ? deleteChatId : null)
        }
      >
        <DialogContent className="max-w-sm" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
          <DialogTitle className="text-base font-semibold">
            {t('sidebar.deleteConfirmTitle')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('sidebar.deleteConfirmDescription', {
              title: deleteTargetTitle ?? t('chat.defaultTitle')
            })}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteChatId(null)}
              disabled={actions.remove.isPending}
            >
              {t('sidebar.cancelDelete')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConversation}
              disabled={actions.remove.isPending}
            >
              {actions.remove.isPending
                ? t('sidebar.deleting')
                : t('sidebar.confirmDelete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </LayoutGroup>
  );
}
