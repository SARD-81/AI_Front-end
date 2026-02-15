'use client';

import {useMemo, useRef, useState} from 'react';
import {LayoutGroup} from 'motion/react';
import {Menu} from 'lucide-react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Sidebar} from '@/components/sidebar/Sidebar';
import {Button} from '@/components/ui/button';
import {Sheet, SheetContent, SheetTrigger} from '@/components/ui/sheet';
import {useThinkingLevel} from '@/hooks/use-thinking-level';
import {Composer} from './Composer';
import {MessageList} from './MessageList';
import {ChatEmptyState} from './ChatEmptyState';
import {useChat, useChatActions, useSendMessage} from '@/hooks/use-chat-data';

export function ChatShell({locale, chatId}: {locale: string; chatId?: string}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [value, setValue] = useState('');
  const [search, setSearch] = useState(false);
  const {thinkingLevel, setThinkingLevel} = useThinkingLevel('standard');
  const [streamContent, setStreamContent] = useState('');
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasSubmittedMessage, setHasSubmittedMessage] = useState(false);
  const [copyToast, setCopyToast] = useState('');
  const copyToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatQuery = useChat(chatId);
  const chat = chatQuery.data;
  const actions = useChatActions();
  const sendMutation = useSendMessage();

  const messages = useMemo(() => {
    const list = chat?.messages ?? [];
    if (!streamContent) return list;
    return [...list, {id: 'streaming', role: 'assistant' as const, content: streamContent, createdAt: new Date().toISOString()}];
  }, [chat?.messages, streamContent]);

  const hasMessages = messages.length > 0 || hasSubmittedMessage;
  const shouldAutoFocus = searchParams.get('focus') === '1';
  const showMessagesLoading = hasMessages && !chat && chatQuery.isFetching && !streamContent;

  const showCopyToast = (text: string) => {
    if (copyToastTimerRef.current) {
      clearTimeout(copyToastTimerRef.current);
    }
    setCopyToast(text);
    copyToastTimerRef.current = setTimeout(() => setCopyToast(''), 1400);
  };

  const submitMessage = async (nextValue: string) => {
    if (!nextValue.trim() || sendMutation.isPending || actions.create.isPending) return;

    const payload = {
      content: nextValue,
      search,
      thinkingLevel,
      deepThink: thinkingLevel !== 'standard'
      // TODO(BACKEND): confirm mapping for deepThink compatibility.
    };

    setErrorMessage('');
    setValue('');
    setStreamContent('');
    setHasSubmittedMessage(true);

    try {
      let activeChatId = chatId;

      if (!activeChatId) {
        const created = await actions.create.mutateAsync({});
        activeChatId = created.id;
        router.push(`/${locale}/chat/${activeChatId}`);
      }

      const result = await sendMutation.mutateAsync({
        chatId: activeChatId,
        payload,
        onToken: (chunk) => setStreamContent((prev) => prev + chunk)
      });

      if (result?.assistantCommitted) {
        setStreamContent('');
      }
    } catch (error) {
      const fallback = 'ارتباط با سرور پاسخ‌گویی برقرار نشد. لطفاً دوباره تلاش کنید.';
      setErrorMessage(error instanceof Error ? error.message : fallback);
    }
  };

  const submit = async () => submitMessage(value);

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showCopyToast('کپی شد');
    } catch {
      showCopyToast('کپی نشد');
    }
  };

  const handleEditMessage = (content: string) => {
    setValue(content);
    setFocusTrigger((prev) => prev + 1);
  };

  const handleRegenerate = async () => {
    const currentMessages = chat?.messages ?? [];
    const lastUserMessage = [...currentMessages].reverse().find((message) => message.role === 'user');
    if (!lastUserMessage) return;
    await submitMessage(lastUserMessage.content);
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
                showMessagesLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">در حال بارگذاری گفتگو...</div>
                ) : (
                  <MessageList
                    messages={messages}
                    typing={sendMutation.isPending && !streamContent}
                    onCopyMessage={handleCopyMessage}
                    onEditMessage={(message) => handleEditMessage(message.content)}
                    onRegenerate={handleRegenerate}
                  />
                )
              ) : (
                <ChatEmptyState
                  value={value}
                  onChange={setValue}
                  onSubmit={submit}
                  disabled={sendMutation.isPending || actions.create.isPending}
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
                  disabled={sendMutation.isPending || actions.create.isPending}
                  search={search}
                  thinkingLevel={thinkingLevel}
                  onToggleSearch={() => setSearch((prev) => !prev)}
                  onThinkingLevelChange={setThinkingLevel}
                  focusTrigger={focusTrigger}
                />
              </div>
            ) : null}
          </LayoutGroup>
        </main>
      </Sheet>

      <div
        aria-live="polite"
        className={`pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-xs text-background transition-all duration-200 ${
          copyToast ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
        }`}
      >
        {copyToast}
      </div>
    </div>
  );
}
