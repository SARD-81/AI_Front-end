'use client';

import {AnimatePresence, LayoutGroup, motion} from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname, useRouter} from 'next/navigation';
import {useEffect, useMemo, useState} from 'react';
import {
  ChevronsRight,
  EllipsisVertical,
  LogOut,
  MessageCircle,
  MessageSquarePlus,
  Settings,
  UserCircle2
} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
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
import {cn} from '@/lib/utils';

const COLLAPSED_WIDTH = 76;
const EXPANDED_WIDTH = 304;

export function Sidebar({locale, onNavigate}: {locale: string; onNavigate?: () => void}) {
  const t = useTranslations('app');
  const pathname = usePathname();
  const router = useRouter();
  const chatsQuery = useChats();
  const groups = useGroupedChats(chatsQuery.data);
  const actions = useChatActions();

  const [collapsed, setCollapsed] = useState(false);
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null); // keep row selected while menu stays open
  const [editingChatId, setEditingChatId] = useState<string | null>(null); // inline rename state
  const [editingTitle, setEditingTitle] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {settings, setSettings} = useAppSettings();

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored) setCollapsed(stored === 'true'); // localStorage persistence for collapse state
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const createNewChat = async () => {
    const created = await actions.create.mutateAsync({title: t('newChat')});
    // TODO(BACKEND): replace local UUID fallback with backend created chat id from POST /chats.
    router.push(`/${locale}/chat/${created.id}?focus=1`);
    onNavigate?.();
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

  return (
    <LayoutGroup>
      <motion.div
        layout
        transition={{duration: 0.2, ease: 'easeOut'}}
        className="h-full"
        style={{width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}}
      >
        <SidebarRoot className="h-full w-full">
          <SidebarHeader className={cn('space-y-3 px-4 py-4', collapsed && 'flex flex-col items-center space-y-3 px-2 py-4')}>
            <Link
              href={`/${locale}`}
              aria-label="خانه"
              className={cn(
                'flex h-10 items-center rounded-lg border border-border bg-muted text-primary',
                collapsed ? 'w-10 justify-center' : 'w-full gap-2 px-2'
              )}
              onClick={onNavigate}
            >
              <Image src="/logo.png" alt="لوگوی دانشگاه شهید بهشتی" width={60} height={60} className="h-15 w-15" />
              {!collapsed ? <span className="truncate whitespace-nowrap text-sm mr-16">دانشگاه شهید بهشتی</span> : null}
            </Link>

            <motion.div layout className={cn('flex items-center gap-3', collapsed && 'flex-col')}>
              <Button
                type="button"
                onClick={createNewChat}
                variant="secondary"
                className={cn(
                  'transition-all duration-200 active:scale-[0.98]',
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

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleCollapsed}
                aria-label={collapsed ? 'باز کردن نوار کناری' : 'بستن نوار کناری'}
                className="h-10 w-10 shrink-0 transition-transform duration-200 active:scale-[0.98]"
                title={collapsed ? 'باز کردن' : 'بستن'}
              >
                <ChevronsRight className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')} />
              </Button>
            </motion.div>
          </SidebarHeader>

          <SidebarContent className={cn('space-y-3', collapsed && 'px-1')}>
            {chatsQuery.isLoading ? (
              <div className="space-y-2 px-1">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
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

                      return (
                        <motion.div layout key={chat.id} className="group">
                          <div
                            className={cn(
                              'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all duration-200 hover:bg-accent active:bg-accent/80 active:scale-[0.99]',
                              isActive && 'bg-accent text-accent-foreground'
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
                                    onChange={(event) => setEditingTitle(event.target.value)}
                                    onBlur={() => {
                                      const title = editingTitle.trim() || chat.title;
                                      actions.rename.mutate({chatId: chat.id, title});
                                      setEditingChatId(null);
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        const title = editingTitle.trim() || chat.title;
                                        actions.rename.mutate({chatId: chat.id, title});
                                        setEditingChatId(null);
                                      }
                                      if (event.key === 'Escape') {
                                        setEditingTitle(chat.title);
                                        setEditingChatId(null);
                                      }
                                    }}
                                    className="h-7 w-full rounded-md border border-border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    dir="rtl"
                                    aria-label="تغییر نام گفتگو"
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
                                  aria-label="گزینه‌های گفتگو"
                                >
                                  <EllipsisVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" side="left">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingChatId(chat.id);
                                    setEditingTitle(chat.title);
                                  }}
                                >
                                  {t('rename')}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => actions.remove.mutate(chat.id)}>
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
                  className={cn('h-11 w-full justify-start gap-2 active:scale-[0.99]', collapsed && 'h-10 w-10 justify-center p-0')}
                  aria-label="پروفایل"
                  title={collapsed ? 'پروفایل' : undefined}
                >
                  <UserCircle2 className="h-5 w-5" />
                  {!collapsed ? (
                    <div className="flex min-w-0 flex-col items-start">
                      <span className="truncate text-sm">کاربر مهمان</span>
                      <span className="text-xs text-muted-foreground">نسخهٔ نمایشی</span>
                    </div>
                  ) : null}
                  {!collapsed ? <EllipsisVertical className="ms-auto h-4 w-4" /> : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="left">
                <DropdownMenuItem
                  onClick={() => {
                    setSettingsOpen(true);
                    onNavigate?.();
                  }}
                >
                  <Settings className="ms-2 h-4 w-4" />
                  تنظیمات
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    // TODO(BACKEND): logout
                    localStorage.removeItem('sidebar-collapsed');
                    router.push('/fa');
                    onNavigate?.();
                  }}
                >
                  <LogOut className="ms-2 h-4 w-4" />
                  خروج از حساب
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </SidebarRoot>
      </motion.div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} setSettings={setSettings} />
    </LayoutGroup>
  );
}
