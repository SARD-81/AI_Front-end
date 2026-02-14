'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {EllipsisVertical, MessageSquarePlus, Moon, Sun, Monitor} from 'lucide-react';
import {useTheme} from 'next-themes';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Skeleton} from '@/components/ui/skeleton';
import {useChatActions, useChats, useGroupedChats} from '@/hooks/use-chat-data';
import {cn} from '@/lib/utils';

function ThemeSwitch() {
  const t = useTranslations('app');
  const {setTheme, theme} = useTheme();

  const options = [
    {id: 'light', label: t('light'), icon: Sun},
    {id: 'dark', label: t('dark'), icon: Moon},
    {id: 'system', label: t('system'), icon: Monitor}
  ] as const;

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-2">
      <span className="text-xs text-muted-foreground">{t('theme')}</span>
      <div className="flex items-center gap-1">
        {options.map((option) => (
          <Button
            key={option.id}
            variant={theme === option.id ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(option.id)}
            aria-label={option.label}
          >
            <option.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
    </div>
  );
}

export function Sidebar({locale, onNavigate}: {locale: string; onNavigate?: () => void}) {
  const t = useTranslations('app');
  const pathname = usePathname();
  const chatsQuery = useChats();
  const groups = useGroupedChats(chatsQuery.data);
  const actions = useChatActions();

  const renderGroup = (title: string, ids: string[]) => {
    if (!ids.length) return null;
    return (
      <section className="space-y-1">
        <h3 className="px-2 text-xs text-muted-foreground">{title}</h3>
        {ids.map((id) => {
          const chat = chatsQuery.data?.find((item) => item.id === id);
          if (!chat) return null;
          const href = `/${locale}/chat/${chat.id}`;
          return (
            <div
              key={chat.id}
              className={cn(
                'group flex items-center rounded-lg px-2 py-2 text-sm hover:bg-accent',
                pathname === href && 'bg-accent'
              )}
            >
              <Link href={href} className="min-w-0 flex-1 truncate" onClick={onNavigate}>
                {chat.title}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                    <EllipsisVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      const title = window.prompt(t('rename'), chat.title);
                      if (title?.trim()) actions.rename.mutate({chatId: chat.id, title});
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
          );
        })}
      </section>
    );
  };

  return (
    <aside className="flex h-full w-full flex-col gap-3 border-l border-border bg-card p-3">
      <Button className="justify-start gap-2" onClick={() => actions.create.mutate()}>
        <MessageSquarePlus className="h-4 w-4" />
        {t('newChat')}
      </Button>
      <Input placeholder="جستجو..." className="h-9" aria-label="جستجو" />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {chatsQuery.isLoading ? (
          <div className="space-y-2 p-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-5/6" />
            <Skeleton className="h-8 w-4/6" />
          </div>
        ) : (
          <>
            {renderGroup(t('today'), groups.today.map((item) => item.id))}
            {renderGroup(t('month'), groups.month.map((item) => item.id))}
            {renderGroup(t('older'), groups.older.map((item) => item.id))}
          </>
        )}
      </div>
      <ThemeSwitch />
    </aside>
  );
}
