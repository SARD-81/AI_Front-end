'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {Menu} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Sidebar} from '@/components/sidebar/Sidebar';
import {Button} from '@/components/ui/button';
import {Sheet, SheetContent, SheetTrigger} from '@/components/ui/sheet';
import {Composer} from './Composer';
import {MessageList} from './MessageList';
import {useChat, useSendMessage} from '@/hooks/use-chat-data';

export function ChatShell({locale, chatId}: {locale: string; chatId?: string}) {
  const t = useTranslations('app');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [value, setValue] = useState('');
  const [search, setSearch] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  const [streamContent, setStreamContent] = useState('');

  const {data: chat} = useChat(chatId);
  const sendMutation = useSendMessage(chatId ?? '');

  const messages = useMemo(() => {
    const list = chat?.messages ?? [];
    if (!streamContent) return list;
    return [...list, {id: 'streaming', role: 'assistant' as const, content: streamContent, createdAt: new Date().toISOString()}];
  }, [chat?.messages, streamContent]);

  const submit = async () => {
    if (!chatId || !value.trim() || sendMutation.isPending) return;
    const payload = {content: value, search, deepThink};
    setValue('');
    setStreamContent('');
    await sendMutation.mutateAsync({
      payload,
      onToken: (chunk) => setStreamContent((prev) => prev + chunk)
    });
    setStreamContent('');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden h-full w-[304px] shrink-0 lg:block">
        <Sidebar locale={locale} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent className="p-0 lg:hidden">
          <Sidebar locale={locale} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-border px-3 md:px-4 lg:px-6">
            <div className="flex items-center gap-2">
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="باز کردن گفتگوها">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <h1 className="truncate text-sm md:text-base">{chat?.title ?? t('emptyTitle')}</h1>
            </div>
            <Link href={`/${locale}`} className="text-xs text-muted-foreground hover:text-foreground">
              {t('newChat')}
            </Link>
          </header>

          <section className="min-h-0 flex-1">
            {chatId ? (
              <MessageList messages={messages} typing={sendMutation.isPending && !streamContent} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <h2 className="text-xl font-semibold md:text-2xl">{t('emptyTitle')}</h2>
                <p className="max-w-md text-sm text-muted-foreground md:text-base">{t('emptyDescription')}</p>
              </div>
            )}
          </section>

          <Composer
            value={value}
            onChange={setValue}
            onSubmit={submit}
            disabled={sendMutation.isPending || !chatId}
            search={search}
            deepThink={deepThink}
            onToggleSearch={() => setSearch((prev) => !prev)}
            onToggleDeepThink={() => setDeepThink((prev) => !prev)}
          />
        </main>
      </Sheet>
    </div>
  );
}
