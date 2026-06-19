'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutGroup } from 'motion/react';
import { Menu } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Composer } from './Composer';
import { MessageList } from './MessageList';
import { ChatEmptyState } from './ChatEmptyState';
import { useChat, useChatActions, useSendMessage } from '@/hooks/use-chat-data';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { toast } from 'sonner';
import type { ChatMessage } from '@/lib/api/chat';

export function ChatShell({
  locale,
  chatId
}: {
  locale: string;
  chatId?: string;
}) {
  const t = useTranslations('app');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');
  const [streamContent, setStreamContent] = useState('');
  const streamChunksRef = useRef<string[]>([]);
  const streamFrameRef = useRef<number | null>(null);
  const streamCreatedAtRef = useRef<string | null>(null);
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
    return [
      ...list,
      {
        id: 'streaming',
        role: 'assistant' as const,
        content: streamContent,
        createdAt: streamCreatedAtRef.current ?? new Date().toISOString()
      }
    ];
  }, [chat?.messages, streamContent]);

  const flushStreamBuffer = () => {
    streamFrameRef.current = null;
    if (!streamChunksRef.current.length) return;
    setStreamContent(streamChunksRef.current.join(''));
  };

  const scheduleStreamFlush = () => {
    if (streamFrameRef.current !== null) return;
    streamFrameRef.current = requestAnimationFrame(flushStreamBuffer);
  };

  const clearStreamingState = () => {
    if (streamFrameRef.current !== null) {
      cancelAnimationFrame(streamFrameRef.current);
      streamFrameRef.current = null;
    }
    streamChunksRef.current = [];
    streamCreatedAtRef.current = null;
    setStreamContent('');
  };

  useEffect(() => {
    return () => {
      if (streamFrameRef.current !== null) {
        cancelAnimationFrame(streamFrameRef.current);
      }
    };
  }, []);

  const shouldAutoFocus = searchParams.get('focus') === '1';
  const isChatLoading = Boolean(chatId) && !chat && chatQuery.isFetching;
  const isSendingOrStreaming = sendMutation.isPending || Boolean(streamContent);
  const failedMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find(
          (message): message is ChatMessage =>
            message.role === 'user' && message.sendStatus === 'failed'
        ),
    [messages]
  );
  const hasMessages = messages.length > 0;
  const shouldShowEmptyState =
    !isChatLoading &&
    !isSendingOrStreaming &&
    !hasMessages &&
    !hasSubmittedMessage;
  const headerTitle = useMemo(() => {
    const firstUserMessage = (chat?.messages ?? [])
      .find((message) => message.role === 'user')
      ?.content?.trim();
    const rawTitle = firstUserMessage || chat?.title || t('chat.defaultTitle');
    const compactTitle = rawTitle.replace(/\s+/g, ' ').trim();
    const maxLength = 72;
    return compactTitle.length > maxLength
      ? `${compactTitle.slice(0, maxLength)}…`
      : compactTitle;
  }, [chat?.messages, chat?.title, t]);

  const submitMessage = async (nextValue: string, clientMessageId?: string) => {
    const trimmedValue = nextValue.trim();
    if (!trimmedValue || sendMutation.isPending || actions.create.isPending)
      return;

    const payload = { content: nextValue };

    setErrorMessage('');
    streamChunksRef.current = [];
    streamCreatedAtRef.current = new Date().toISOString();
    setStreamContent('');
    setHasSubmittedMessage(true);

    try {
      let activeChatId = chatId;

      if (!activeChatId) {
        const created = await actions.create.mutateAsync({ title: t('newChat') });
        activeChatId = created.id;
        router.push(`/${locale}/chat/${activeChatId}`);
      }

      const result = await sendMutation.mutateAsync({
        chatId: activeChatId,
        payload,
        clientMessageId,
        onToken: (chunk) => {
          streamChunksRef.current.push(chunk);
          scheduleStreamFlush();
        }
      });

      if (streamFrameRef.current !== null) {
        cancelAnimationFrame(streamFrameRef.current);
        flushStreamBuffer();
      }

      if (result?.assistantCommitted) {
        clearStreamingState();
      }
      setValue('');
    } catch (error) {
      clearStreamingState();
      const fallback = t('chat.connectionError');
      setErrorMessage(error instanceof Error ? error.message : fallback);
    }
  };

  const submit = async () => submitMessage(value);

  const handleRetryFailedMessage = async () => {
    if (!failedMessage) return;
    await submitMessage(failedMessage.content, failedMessage.id);
  };

  const handleRestoreFailedMessage = () => {
    if (!failedMessage) return;
    setValue(failedMessage.content);
    setFocusTrigger((prev) => prev + 1);
  };

  const handleCopyMessage = async (content: string) => {
    const copied = await copyToClipboard(content);

    if (copied) {
      toast.success(t('chat.copySuccess'));
      return;
    }

    toast.error(t('chat.copyError'));
  };

  const handleEditMessage = (content: string) => {
    setValue(content);
    setFocusTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const deletedChatId = actions.remove.variables;
    if (!deletedChatId || !actions.remove.isSuccess || !chatId) return;
    if (deletedChatId !== chatId) return;

    queryClient.removeQueries({ queryKey: ['chat', deletedChatId] });
    queryClient.invalidateQueries({ queryKey: ['chats'] });
    router.replace(`/${locale}/chat`);
  }, [
    actions.remove.isSuccess,
    actions.remove.variables,
    chatId,
    locale,
    queryClient,
    router
  ]);

  const handleRegenerate = async () => {
    const currentMessages = chat?.messages ?? [];
    const lastUserMessage = [...currentMessages]
      .reverse()
      .find((message) => message.role === 'user');
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
          <header className="relative flex min-h-14 items-center border-b border-border py-1 sm:h-14 sm:py-0">
            <div className="mx-auto flex w-full max-w-3xl items-center px-4 sm:px-6">
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label={t('chat.openConversations')}
                  title={t('chat.openConversations')}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </div>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <h1 className="w-full max-w-3xl truncate px-16 text-center text-sm font-medium leading-6 sm:px-6 md:text-base">
                {headerTitle}
              </h1>
            </div>
          </header>

          {errorMessage ? (
            <div
              role="alert"
              className="border-b border-destructive/40 bg-destructive/15 px-4 py-2 text-sm text-destructive"
            >
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>{errorMessage}</span>
                {failedMessage ? (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleRetryFailedMessage}
                      disabled={sendMutation.isPending}
                    >
                      {t('chat.retryFailed')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleRestoreFailedMessage}
                    >
                      {t('chat.restoreToInput')}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
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
                    onEditMessage={(message) =>
                      handleEditMessage(message.content)
                    }
                    onRegenerate={handleRegenerate}
                    onRetryMessage={(message) =>
                      submitMessage(message.content, message.id)
                    }
                    onRestoreMessage={(message) => {
                      setValue(message.content);
                      setFocusTrigger((prev) => prev + 1);
                    }}
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
                    disabled={
                      sendMutation.isPending || actions.create.isPending
                    }
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
