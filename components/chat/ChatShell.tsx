'use client';

import {useMemo, useState} from 'react';
import {LayoutGroup} from 'motion/react';
import {Menu} from 'lucide-react';
import {useSearchParams} from 'next/navigation';
import {Sidebar} from '@/components/sidebar/Sidebar';
import {Button} from '@/components/ui/button';
import {Sheet, SheetContent, SheetTrigger} from '@/components/ui/sheet';
import {useThinkingLevel} from '@/hooks/use-thinking-level';
import {Composer} from './Composer';
import {MessageList} from './MessageList';
import {ChatEmptyState} from './ChatEmptyState';
import {useChat, useSendMessage} from '@/hooks/use-chat-data';

export function ChatShell({locale, chatId}: {locale: string; chatId?: string}) {
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [value, setValue] = useState('');
  const [search, setSearch] = useState(false);
  const {thinkingLevel, setThinkingLevel} = useThinkingLevel('standard');
  const [streamContent, setStreamContent] = useState('');
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

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

    const message = value;
    const payload = {
      content: message,
      search,
      thinkingLevel,
      deepThink: thinkingLevel !== 'standard'
      // TODO(BACKEND): confirm mapping for deepThink compatibility.
    };

    setErrorMessage('');
    setValue('');
    setStreamContent('');

    try {
      await sendMutation.mutateAsync({
        payload,
        onToken: (chunk) => setStreamContent((prev) => prev + chunk)
      });
    } catch (error) {
      const fallback = 'ارتباط با سرور پاسخ‌گویی برقرار نشد. لطفاً دوباره تلاش کنید.';
      setErrorMessage(error instanceof Error ? error.message : fallback);
    } finally {
      setStreamContent('');
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

          {errorMessage ? (
            <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{errorMessage}</div>
          ) : null}

          <LayoutGroup>
            <section className="min-h-0 flex-1 overflow-hidden">
              {hasMessages ? (
                <MessageList messages={messages} typing={sendMutation.isPending && !streamContent} />
              ) : (
                <ChatEmptyState
                  value={value}
                  onChange={setValue}
                  onSubmit={submit}
                  disabled={sendMutation.isPending || !chatId}
                  search={search}
                  thinkingLevel={thinkingLevel}
                  onToggleSearch={() => setSearch((prev) => !prev)}
                  onThinkingLevelChange={setThinkingLevel}
                  autoFocus={shouldAutoFocus}
                  focusTrigger={focusTrigger}
                  onPromptSelect={(prompt) => {
                    setValue(prompt);
                    setFocusTrigger((prev) => prev + 1);
                  }}
                />
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
                  thinkingLevel={thinkingLevel}
                  onToggleSearch={() => setSearch((prev) => !prev)}
                  onThinkingLevelChange={setThinkingLevel}
                />
              </div>
            ) : null}
          </LayoutGroup>
        </main>
      </Sheet>
    </div>
  );
}
