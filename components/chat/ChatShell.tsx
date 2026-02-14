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

const RATE_LIMIT_STATUS = 429;

export function ChatShell({locale, chatId}: {locale: string; chatId?: string}) {
  const t = useTranslations('app');
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [value, setValue] = useState('');
  const [search, setSearch] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    const draft = value;
    setErrorMessage(null);
    setStreamContent('');

    try {
      await sendMutation.mutateAsync({
        payload: {content: draft, search, deepThink},
        messages: [
          ...(chat?.messages ?? []).map((message) => ({role: message.role, content: message.content})),
          {role: 'user', content: draft}
        ],
        onToken: (chunk) => setStreamContent((prev) => prev + chunk)
      });

      setValue('');
      setStreamContent('');
    } catch (error) {
      setStreamContent('');
      const status =
        typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
          ? error.status
          : undefined;
      if (status === RATE_LIMIT_STATUS) {
        setErrorMessage('درخواست‌های شما بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.');
      } else {
        setErrorMessage('خطا در ارتباط با سرور AvalAI. لطفاً دوباره تلاش کنید.');
      }
      setValue(draft);
    }
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
              <footer className="border-t border-border bg-background/80 px-3 py-3 backdrop-blur md:px-4 lg:px-6">
                <div className="mx-auto w-full max-w-[920px] space-y-2">
                  {errorMessage ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {errorMessage}
                    </div>
                  ) : null}
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
              </footer>
            ) : null}
          </LayoutGroup>
        </main>
      </Sheet>
    </div>
  );
}
