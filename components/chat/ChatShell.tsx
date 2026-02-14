'use client';

import {useMemo, useState} from 'react';
import {LayoutGroup} from 'motion/react';
import {Menu} from 'lucide-react';
import {useSearchParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {Sidebar} from '@/components/sidebar/Sidebar';
import {Button} from '@/components/ui/button';
import {Sheet, SheetContent, SheetTrigger} from '@/components/ui/sheet';
import {Composer} from './Composer';
import {MessageList} from './MessageList';
import {useChat, useSendMessage} from '@/hooks/use-chat-data';

export function ChatShell({locale, chatId}: {locale: string; chatId?: string}) {
  const t = useTranslations('app');
  const searchParams = useSearchParams();
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

  const hasMessages = messages.length > 0;
  const shouldAutoFocus = searchParams.get('focus') === '1';

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
      <div className="hidden h-full shrink-0 lg:block">
        <Sidebar locale={locale} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent className="w-[304px] p-0 sm:max-w-[304px] lg:hidden">
          <Sidebar locale={locale} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center border-b border-border px-3 md:px-4 lg:px-6">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="باز کردن گفتگوها">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </header>

          <LayoutGroup>
            <section className="min-h-0 flex-1 overflow-hidden">
              {hasMessages ? (
                <MessageList messages={messages} typing={sendMutation.isPending && !streamContent} />
              ) : (
                <div className="flex h-full items-center justify-center px-4">
                  <div className="w-full max-w-[800px] space-y-4 text-center">
                    <p className="text-sm text-muted-foreground md:text-base">{t('emptyDescription')}</p>
                    <Composer
                      value={value}
                      onChange={setValue}
                      onSubmit={submit}
                      disabled={sendMutation.isPending || !chatId}
                      search={search}
                      deepThink={deepThink}
                      onToggleSearch={() => setSearch((prev) => !prev)}
                      onToggleDeepThink={() => setDeepThink((prev) => !prev)}
                      autoFocus={shouldAutoFocus}
                    />
                  </div>
                </div>
              )}
            </section>

            {hasMessages ? (
              <div className="sticky bottom-0 z-10 border-t border-border bg-background/95 p-3 backdrop-blur md:p-4">
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
              </div>
            ) : null}
          </LayoutGroup>
        </main>
      </Sheet>
    </div>
  );
}
