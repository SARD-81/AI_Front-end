'use client';

import {AnimatePresence, LayoutGroup, motion} from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname, useRouter} from 'next/navigation';
import {useEffect, useMemo, useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {
  ChevronsRight,
  EllipsisVertical,
  LogOut,
  MessageCircle,
  MessageSquarePlus,
  Settings,
  UserCircle2,
  UserPen
} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {Skeleton} from '@/components/ui/skeleton';
import {Sidebar as SidebarRoot, SidebarContent, SidebarFooter, SidebarHeader} from '@/components/ui/sidebar';
import {useChatActions, useChats, useGroupedChats} from '@/hooks/use-chat-data';
import {SettingsModal, useAppSettings} from '@/components/settings/SettingsModal';
import {getMe, logout} from '@/lib/services/auth-service';
import {useMediaQuery} from '@/hooks/use-media-query';
import {cn} from '@/lib/utils';

const COLLAPSED_WIDTH = 76;
const EXPANDED_WIDTH = 304;
const MAX_CONVERSATION_TITLE_LENGTH = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function Sidebar({locale, onNavigate}: {locale: string; onNavigate?: () => void}) {
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
  const groups = useGroupedChats(chatsQuery.data);
  const actions = useChatActions();

  const currentChatId = useMemo(() => {
    const match = pathname?.match(/\/chat[s]?\/([^/?#]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const [collapsed, setCollapsed] = useState(false);
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null); // keep row selected while menu stays open
  const [editingChatId, setEditingChatId] = useState<string | null>(null); // inline rename state
  const [editingTitle, setEditingTitle] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 1023px)');

  const {settings, setSettings} = useAppSettings();

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

  const createNewChat = async () => {
    const created = await actions.create.mutateAsync({title: t('newChat')});
    // TODO(BACKEND): confirm created chat id shape from POST /conversations/.
    router.push(`/${locale}/chat/${created.id}?focus=1`);
    onNavigate?.();
  };

  const commitRename = async (chatId: string, previousTitle: string) => {
    const title = editingTitle.trim();

    if (!title) {
      setEditingTitle(previousTitle);
      setEditingChatId(null);
      return;
    }

    if (title.length > MAX_CONVERSATION_TITLE_LENGTH) {
      toast.error(t('sidebar.renameTitleTooLong', {max: MAX_CONVERSATION_TITLE_LENGTH}));
      return;
    }

    if (title === previousTitle.trim()) {
      setEditingChatId(null);
      return;
    }

    try {
      await actions.rename.mutateAsync({chatId, title});
      setEditingChatId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('sidebar.renameError');
      toast.error(message);
      setEditingTitle(previousTitle);
    }
  };

  const handleDeleteConversation = async () => {
    if (!deleteChatId) return;

    try {
      await actions.remove.mutateAsync(deleteChatId);
      setDeleteChatId(null);
      if (currentChatId !== deleteChatId) return;

      const remainingChats = (queryClient.getQueryData(['chats']) as {id: string}[] | undefined) ?? [];
      const nextChatId = remainingChats[0]?.id;

      if (nextChatId) {
        router.replace(`/${locale}/chat/${nextChatId}`);
        onNavigate?.();
        return;
      }

      try {
        const created = await actions.create.mutateAsync({title: t('newChat')});
        router.replace(`/${locale}/chat/${created.id}?focus=1`);
        onNavigate?.();
        return;
      } catch {
        router.replace(`/${locale}/chat`);
        onNavigate?.();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('sidebar.deleteError');
      toast.error(message);
    }
  };

  const chatGroups = useMemo(
    () => [
      {title: t('today'), ids: groups.today.map((item) => item.id)},
      {title: t('month'), ids: groups.month.map((item) => item.id)},
      {title: t('older'), ids: groups.older.map((item) => item.id)}
    ],
    [groups.month, groups.older, groups.today, t]
  );

  const chatsById = useMemo(() => {
    const entries = (chatsQuery.data ?? []).map((chat) => [chat.id, chat] as const);
    return new Map(entries);
  }, [chatsQuery.data]);

  const hasChats = (chatsQuery.data?.length ?? 0) > 0;
  const deleteTargetTitle = deleteChatId ? chatsById.get(deleteChatId)?.title : undefined;

  const user = profileQuery.data?.user;
  const fullName = user?.fullName?.trim();
  const firstLastName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const profileName = fullName || firstLastName || user?.studentId || t('sidebar.guestUser');
  const profileSubtitle = user?.studentId || user?.email || t('sidebar.demoVersion');

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
        transition={{duration: 0.2, ease: 'easeOut'}}
        className="h-full"
        style={{width: isMobile ? EXPANDED_WIDTH : collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}}
      >
        <SidebarRoot className="h-full w-full">
          <SidebarHeader className={cn('space-y-3 px-4 py-4', collapsed && 'flex flex-col items-center space-y-3 px-2 py-4')}>
            <Link
              href={`/${locale}`}
              aria-label={t('sidebar.home')}
              className={cn(
                'flex h-10 items-center rounded-lg border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-elevated))] text-primary shadow-sm',
                collapsed ? 'w-10 justify-center' : 'w-full gap-2 px-2'
              )}
              onClick={onNavigate}
            >
              <Image src="/Logo.png" alt={t('sidebar.logoAlt')} width={60} height={60} className="h-15 w-15" />
              {!collapsed ? <span className="truncate whitespace-nowrap text-sm mr-16">{t('sidebar.universityName')}</span> : null}
            </Link>

            <motion.div layout className={cn('flex items-center gap-3', collapsed && 'flex-col')}>
              <Button
                type="button"
                onClick={createNewChat}
                variant="secondary"
                className={cn(
                  'transition-all duration-200 active:scale-[0.98] shadow-sm',
                  collapsed ? 'h-10 w-10 p-0' : 'h-10 flex-1 justify-start gap-2'
                )}
                aria-label={t('newChat')}
                title={collapsed ? t('newChat') : undefined}
              >
                <MessageSquarePlus className="h-4 w-4" />
                <AnimatePresence initial={false}>
                  {!collapsed ? (
                    <motion.span
                      initial={{opacity: 0, x: -8}}
                      animate={{opacity: 1, x: 0}}
                      exit={{opacity: 0, x: -8}}
                      transition={{duration: 0.18, ease: 'easeOut'}}
                    >
                      {t('newChat')}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </Button>

              {!isMobile ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleCollapsed}
                  aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
                  className="h-10 w-10 shrink-0 border border-transparent transition-transform duration-200 hover:border-[hsl(var(--surface-subtle))] hover:bg-[hsl(var(--surface-elevated))] active:scale-[0.98]"
                  title={collapsed ? t('sidebar.expandShort') : t('sidebar.collapseShort')}
                >
                  <ChevronsRight className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')} />
                </Button>
              ) : null}
            </motion.div>
          </SidebarHeader>

          <SidebarContent className={cn('space-y-3', collapsed && 'px-1')}>
            {chatsQuery.isLoading ? (
              <div className="space-y-2 px-1">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : chatsQuery.isError ? (
              <div className={cn('space-y-2 px-2 py-3', collapsed && 'px-1 text-center')}>
                {!collapsed ? <p className="text-xs text-muted-foreground">{t('sidebar.loadError')}</p> : null}
                <Button
                  type="button"
                  variant="ghost"
                  size={collapsed ? 'icon' : 'sm'}
                  onClick={() => chatsQuery.refetch()}
                  className={cn('h-8', !collapsed && 'w-full justify-start')}
                  aria-label={t('sidebar.retry')}
                  title={collapsed ? t('sidebar.retry') : undefined}
                >
                  {collapsed ? <MessageCircle className="h-4 w-4" /> : t('sidebar.retry')}
                </Button>
              </div>
            ) : !hasChats ? (
              <div className={cn('px-2 py-3', collapsed && 'px-1 text-center')}>
                {!collapsed ? <p className="text-xs text-muted-foreground">{t('sidebar.emptyHistory')}</p> : null}
              </div>
            ) : (
              chatGroups.map((group) => {
                if (!group.ids.length) return null;
                return (
                  <section key={group.title} className="space-y-1">
                    {!collapsed ? <p className="px-2 text-xs text-muted-foreground">{group.title}</p> : null}
                    {group.ids.map((id) => {
                      const chat = chatsById.get(id);
                      if (!chat) return null;

                      const href = `/${locale}/chat/${chat.id}`;
                      const isActive = pathname === href || openMenuChatId === chat.id;
                      const canRenameConversation = UUID_PATTERN.test(chat.id) && Boolean(chat.title.trim());

                      return (
                        <motion.div layout key={chat.id} className="group">
                          <div
                            className={cn(
                              'flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-foreground transition-all duration-200 hover:border-[hsl(var(--surface-subtle))] hover:bg-[hsl(var(--surface-elevated))] active:bg-[hsl(var(--surface-subtle))] active:scale-[0.99]',
                              isActive && 'border-[hsl(var(--field-border))] bg-[hsl(var(--surface-elevated))] text-foreground shadow-sm'
                            )}
                          >
                            <Link
                              href={href}
                              className={cn('flex min-w-0 flex-1 items-center gap-2', collapsed && 'justify-center')}
                              onClick={onNavigate}
                              title={collapsed ? chat.title : undefined}
                            >
                              <MessageCircle className="h-4 w-4 shrink-0" />
                              {!collapsed ? (
                                editingChatId === chat.id ? (
                                  <input
                                    autoFocus
                                    value={editingTitle}
                                    maxLength={MAX_CONVERSATION_TITLE_LENGTH}
                                    onChange={(event) => setEditingTitle(event.target.value)}
                                    onBlur={() => {
                                      void commitRename(chat.id, chat.title);
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        event.currentTarget.blur();
                                      }
                                      if (event.key === 'Escape') {
                                        setEditingTitle(chat.title);
                                        setEditingChatId(null);
                                      }
                                    }}
                                    className="h-7 w-full rounded-md border border-[hsl(var(--field-border))] bg-[hsl(var(--field))] px-2 text-sm text-[hsl(var(--field-foreground))] outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] focus-visible:ring-offset-2"
                                    dir="rtl"
                                    aria-label={t('sidebar.renameInput')}
                                  />
                                ) : (
                                  <span className="truncate text-sm">{chat.title}</span>
                                )
                              ) : null}
                            </Link>

                            <DropdownMenu onOpenChange={(open) => setOpenMenuChatId(open ? chat.id : null)}>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    'h-7 w-7 transition-opacity duration-150 active:scale-[0.98]',
                                    collapsed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                                    isActive && 'opacity-100'
                                  )}
                                  aria-label={t('sidebar.chatOptions')}
                                >
                                  <EllipsisVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" side="left" className="border-[hsl(var(--menu-border))] bg-[hsl(var(--menu))] text-[hsl(var(--menu-foreground))] shadow-card">
                                {canRenameConversation ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingChatId(chat.id);
                                      setEditingTitle(chat.title);
                                    }}
                                  >
                                    {t('rename')}
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem
                                  className="text-destructive"
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
                  className={cn('h-11 w-full justify-start gap-2 border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))] shadow-sm hover:bg-[hsl(var(--surface-elevated))] active:scale-[0.99]', collapsed && 'h-10 w-10 justify-center p-0')}
                  aria-label={t('sidebar.profile')}
                  title={collapsed ? t('sidebar.profile') : undefined}
                >
                  <UserCircle2 className="h-5 w-5" />
                  {!collapsed ? (
                    <div className="flex min-w-0 flex-col items-start">
                      <span className="truncate text-sm">{profileName}</span>
                      <span className="text-xs text-muted-foreground">{profileSubtitle}</span>
                    </div>
                  ) : null}
                  {!collapsed ? <EllipsisVertical className="ms-auto h-4 w-4" /> : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="left" className="border-[hsl(var(--menu-border))] bg-[hsl(var(--menu))] text-[hsl(var(--menu-foreground))] shadow-card">
                <DropdownMenuItem
                  onClick={() => {
                    setSettingsOpen(true);
                    onNavigate?.();
                  }}
                >
                  <Settings className="ms-2 h-4 w-4" />
                  {t('sidebar.settings')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    router.push(`/${locale}/profile`);
                    onNavigate?.();
                  }}
                >
                  <UserPen className="ms-2 h-4 w-4" />
                  {t('sidebar.editProfile')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setLogoutConfirmOpen(true)}
                >
                  <LogOut className="ms-2 h-4 w-4" />
                  {t('sidebar.logoutNow')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </SidebarRoot>
      </motion.div>

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        setSettings={setSettings}
        user={user}
        isUserLoading={profileQuery.isLoading}
      />

      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent className="max-w-sm" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
          <DialogTitle className="text-base font-semibold">{t('sidebar.logoutConfirmTitle')}</DialogTitle>
          <p className="text-sm text-muted-foreground">{t('sidebar.logoutConfirmDescription')}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setLogoutConfirmOpen(false)}>
              {t('sidebar.cancelLogout')}
            </Button>
            <Button type="button" variant="destructive" onClick={handleLogout}>
              {t('sidebar.confirmLogout')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteChatId)} onOpenChange={(open) => !actions.remove.isPending && setDeleteChatId(open ? deleteChatId : null)}>
        <DialogContent className="max-w-sm" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
          <DialogTitle className="text-base font-semibold">{t('sidebar.deleteConfirmTitle')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('sidebar.deleteConfirmDescription', {title: deleteTargetTitle ?? t('chat.defaultTitle')})}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteChatId(null)} disabled={actions.remove.isPending}>
              {t('sidebar.cancelDelete')}
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConversation} disabled={actions.remove.isPending}>
              {actions.remove.isPending ? t('sidebar.deleting') : t('sidebar.confirmDelete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </LayoutGroup>
  );
}
