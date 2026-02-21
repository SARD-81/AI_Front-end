'use client';

import {useMemo, useState} from 'react';
import {LayoutGroup} from 'motion/react';
import {Menu} from 'lucide-react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Sidebar} from '@/components/sidebar/Sidebar';
import {Button} from '@/components/ui/button';
import {Sheet, SheetContent, SheetTrigger} from '@/components/ui/sheet';
import {Skeleton} from '@/components/ui/skeleton';
import {useThinkingLevel} from '@/hooks/use-thinking-level';
import {Composer} from './Composer';
import {MessageList} from './MessageList';
import {ChatEmptyState} from './ChatEmptyState';
import {useChat, useChatActions, useSendMessage} from '@/hooks/use-chat-data';
import {copyToClipboard} from '@/lib/utils/clipboard';
import {toast} from 'sonner';

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

  const chatQuery = useChat(chatId);
  const chat = chatQuery.data;
  const actions = useChatActions();
  const sendMutation = useSendMessage();

  const messages = useMemo(() => {
    const list = chat?.messages ?? [];
    if (!streamContent) return list;
    return [...list, {id: 'streaming', role: 'assistant' as const, content: streamContent, createdAt: new Date().toISOString()}];
  }, [chat?.messages, streamContent]);

  const shouldAutoFocus = searchParams.get('focus') === '1';
  const isChatLoading = Boolean(chatId) && !chat && chatQuery.isFetching;
  const isSendingOrStreaming = sendMutation.isPending || Boolean(streamContent);
  const hasMessages = messages.length > 0;
  const shouldShowEmptyState = !isChatLoading && !isSendingOrStreaming && !hasMessages && !hasSubmittedMessage;
  const headerTitle = useMemo(() => {
    const firstUserMessage = (chat?.messages ?? []).find((message) => message.role === 'user')?.content?.trim();
    const rawTitle = firstUserMessage || chat?.title || 'گفت‌وگو';
    const compactTitle = rawTitle.replace(/\s+/g, ' ').trim();
    const maxLength = 72;
    return compactTitle.length > maxLength ? `${compactTitle.slice(0, maxLength)}…` : compactTitle;
  }, [chat?.messages, chat?.title]);


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
    const copied = await copyToClipboard(content);

    if (copied) {
      toast.success('کپی شد');
      return;
    }

    toast.error('کپی پیام ممکن نبود');
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
          <header className="relative flex h-14 items-center border-b border-border">
            <div className="mx-auto flex w-full max-w-3xl items-center px-4 sm:px-6">
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="باز کردن گفتگوها">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </div>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <h1 className="w-full max-w-3xl truncate px-14 text-center text-sm font-medium sm:px-6 md:text-base">{headerTitle}</h1>
            </div>
          </header>

          {errorMessage ? (
            <div className="border-b border-destructive/40 bg-destructive/15 px-4 py-2 text-sm text-destructive">{errorMessage}</div>
          ) : null}

          <LayoutGroup>
            <section className="min-h-0 flex-1 overflow-hidden">
              {isChatLoading ? (
                <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-16 w-4/5" />
                  <Skeleton className="h-12 w-3/5" />
                  <Skeleton className="h-20 w-5/6" />
                </div>
              ) : shouldShowEmptyState ? (
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
              ) : (
                <div className="h-full w-full">
                  <MessageList
                    messages={messages}
                    typing={sendMutation.isPending && !streamContent}
                    onCopyMessage={handleCopyMessage}
                    onEditMessage={(message) => handleEditMessage(message.content)}
                    onRegenerate={handleRegenerate}
                  />
                </div>
              )}
            </section>

            {!shouldShowEmptyState ? (
              <div className="sticky bottom-0 z-10 border-t border-border bg-background/95 py-3 backdrop-blur md:py-4">
                <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
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
              </div>
            ) : null}
          </LayoutGroup>
        </main>
      </Sheet>
    </div>
  );
}
