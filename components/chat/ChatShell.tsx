'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutGroup } from 'motion/react';
import { Menu } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { SohaFooter } from '@/components/layout/SohaFooter';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Composer } from './Composer';
import { MessageList } from './MessageList';
import { ChatEmptyState } from './ChatEmptyState';
import { useChat, useChatActions, useSendMessage } from '@/hooks/use-chat-data';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { uuid } from '@/lib/utils/uid';
import { toast } from 'sonner';
import type { ChatDetail, ChatMessage, ThinkingLevel } from '@/lib/api/chat';
import { ApiError } from '@/lib/api/client';
import { formatRateLimitMessage, isRateLimitCode } from '@/lib/api/rate-limit';
import { ChatWebSocketError } from '@/lib/services/chat-service';
import { useOnlineStatus } from '@/hooks/use-online-status';

const BACKEND_WS_USER_FACING_CODES = new Set([
  'server_busy',
  'ai_starting',
  'ai_unavailable',
  'ai_timeout',
  'ai_error',
  'invalid_ai_response',
  'internal_error'
]);

const THINKING_LEVEL_STORAGE_KEY = 'soha:chat:thinking-level';

function isThinkingLevel(value: string | null): value is ThinkingLevel {
  return value === 'low' || value === 'medium' || value === 'high';
}

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
  const editingMessageIdRef = useRef<string | null>(null);
  const [value, setValue] = useState('');
  const [streamContent, setStreamContent] = useState('');
  const streamChunksRef = useRef<string[]>([]);
  const streamFrameRef = useRef<number | null>(null);
  const streamCreatedAtRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [, setErrorMessage] = useState('');
  const isOnline = useOnlineStatus();
  const [hasSubmittedMessage, setHasSubmittedMessage] = useState(false);
  const [thinkLevel, setThinkLevel] = useState<ThinkingLevel>('low');
  const [activeChatId, setActiveChatId] = useState(chatId);
  const regenerateTargetRef = useRef<{ userId: string; assistantId: string } | null>(null);

  const chatQuery = useChat(activeChatId);
  const chat = chatQuery.data;
  const actions = useChatActions();
  const sendMutation = useSendMessage();

  useEffect(() => {
    setActiveChatId(chatId);
  }, [chatId]);

  useEffect(() => {
    const storedThinkingLevel = window.localStorage.getItem(
      THINKING_LEVEL_STORAGE_KEY
    );
    if (isThinkingLevel(storedThinkingLevel)) {
      setThinkLevel(storedThinkingLevel);
    }
  }, []);

  const handleThinkLevelChange = (nextLevel: ThinkingLevel) => {
    setThinkLevel(nextLevel);
    try {
      window.localStorage.setItem(THINKING_LEVEL_STORAGE_KEY, nextLevel);
    } catch {
      // The in-memory selection still persists for the current ChatShell.
    }
  };

  const messages = useMemo(() => {
    const list = chat?.messages ?? [];
    if (!streamContent) return list;

    const streamingMessage = {
      id: 'streaming',
      role: 'assistant' as const,
      content: streamContent,
      createdAt: streamCreatedAtRef.current ?? new Date().toISOString()
    };
    const regenerateTarget = regenerateTargetRef.current;
    if (regenerateTarget) {
      const userIndex = list.findIndex(
        (message) => message.id === regenerateTarget.userId
      );
      if (userIndex >= 0) {
        return [
          ...list.slice(0, userIndex + 1),
          streamingMessage,
          ...list.slice(userIndex + 1)
        ];
      }
    }

    return [...list, streamingMessage];
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
  const isChatLoading =
    Boolean(activeChatId) && !chat && chatQuery.isFetching;
  const isSendingOrStreaming = sendMutation.isPending || Boolean(streamContent);
  const hasMessages = messages.length > 0;
  const shouldShowEmptyState =
    !isChatLoading &&
    !isSendingOrStreaming &&
    !hasMessages &&
    !hasSubmittedMessage;
  const headerTitle = useMemo(() => {
    const rawTitle = chat?.title?.trim() || t('chat.defaultTitle');
    const compactTitle = rawTitle.replace(/\s+/g, ' ').trim();
    const maxLength = 72;
    return compactTitle.length > maxLength
      ? `${compactTitle.slice(0, maxLength)}…`
      : compactTitle;
  }, [chat?.title, t]);

  const getChatUserErrorMessage = (error: unknown) => {
    if (error instanceof ChatWebSocketError) {
      if (error.shouldRedirectToProfile || error.code === 'PROFILE_INCOMPLETE') {
        return t('chat.profileIncomplete');
      }

      if (error.isLocked || error.code === 'LOCKED') {
        return t('chat.accountLocked');
      }

      if (isRateLimitCode(error.code)) {
        return formatRateLimitMessage(locale, error.code, null);
      }

      if (
        error.code &&
        BACKEND_WS_USER_FACING_CODES.has(error.code) &&
        error.message.trim()
      ) {
        return error.message;
      }

      const normalizedCode = error.code?.toUpperCase() ?? '';
      if (
        error.closeCode === 4401 ||
        normalizedCode.includes('UNAUTHORIZED') ||
        normalizedCode.includes('AUTH')
      ) {
        return t('chat.sessionExpired');
      }

      if (
        error.closeCode === 4404 ||
        normalizedCode.includes('NOT_FOUND') ||
        normalizedCode.includes('CONVERSATION')
      ) {
        return t('chat.conversationNotFound');
      }

      if (normalizedCode.includes('TIMEOUT')) {
        return t('chat.timeout');
      }

      return t('chat.connectionError');
    }

    if (error instanceof ApiError) {
      if (error.status === 429 || isRateLimitCode(error.code)) {
        return formatRateLimitMessage(
          locale,
          error.code ?? 'rate_limited',
          error.retryAfter
        );
      }

      if (error.status === 401 || error.status === 403) {
        return t('chat.sessionExpired');
      }

      if (error.status === 404) {
        return t('chat.conversationNotFound');
      }

      if (error.status === 408 || error.status === 504) {
        return t('chat.timeout');
      }

      return t('chat.unknownSendError');
    }

    if (
      typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError'
    ) {
      return t('chat.timeout');
    }

    if (error instanceof Error) {
      const normalizedMessage = error.message.toLowerCase();

      if (error.name === 'AbortError' || normalizedMessage.includes('timeout')) {
        return t('chat.timeout');
      }

      if (
        error.name === 'TypeError' ||
        normalizedMessage.includes('fetch') ||
        normalizedMessage.includes('network') ||
        normalizedMessage.includes('websocket') ||
        normalizedMessage.includes('connection')
      ) {
        return t('chat.connectionError');
      }
    }

    return t('chat.unknownSendError');
  };

  const submitMessage = async (
    nextValue: string,
    clientMessageId?: string,
    options?: {
      replaceAssistantMessageId?: string;
      restoreAssistantMessage?: ChatMessage;
    }
  ) => {
    const trimmedValue = nextValue.trim();
    if (!trimmedValue || sendMutation.isPending || actions.create.isPending)
      return;

    const stableClientMessageId = clientMessageId ?? uuid();
    const payload = {
      content: nextValue,
      thinkLevel,
      clientMessageId: stableClientMessageId
    };

    const editedMessageId = editingMessageIdRef.current;
    if (editedMessageId) {
      dropMessagesFrom(editedMessageId);
      editingMessageIdRef.current = null;
    }

    setErrorMessage('');
    streamChunksRef.current = [];
    streamCreatedAtRef.current = new Date().toISOString();
    setStreamContent('');
    setHasSubmittedMessage(true);

    let resolvedChatId = activeChatId;
    let createdChatId: string | undefined;

    try {
      if (!resolvedChatId) {
        const created = await actions.create.mutateAsync({ title: t('newChat') });
        resolvedChatId = created.id;
        createdChatId = created.id;
        setActiveChatId(created.id);
      }

      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const result = await sendMutation.mutateAsync({
        chatId: resolvedChatId,
        payload,
        clientMessageId: stableClientMessageId,
        replaceAssistantMessageId: options?.replaceAssistantMessageId,
        restoreAssistantMessage: options?.restoreAssistantMessage,
        signal: abortController.signal,
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
        queryClient.invalidateQueries({ queryKey: ['chat', resolvedChatId] });
        queryClient.invalidateQueries({ queryKey: ['chats'] });
      }
      abortControllerRef.current = null;
      setValue('');
    } catch (error) {
      clearStreamingState();
      if (abortControllerRef.current?.signal.aborted) {
        queryClient.setQueryData<ChatDetail>(
          ['chat', resolvedChatId],
          (previous) => {
            if (!previous) return previous;
            return {
              ...previous,
              messages: previous.messages.map((message) =>
                message.id === stableClientMessageId
                  ? { ...message, sendStatus: 'sent' as const }
                  : message
              )
            };
          }
        );
        abortControllerRef.current = null;
        return;
      }
      if (process.env.NODE_ENV === 'development') {
        console.error('Chat send failed', error);
      }

      if (error instanceof ChatWebSocketError && error.shouldRedirectToProfile) {
        router.push(`/${locale}/profile`);
      }

      const friendlyError = getChatUserErrorMessage(error);
      setErrorMessage(friendlyError);
      toast.error(friendlyError);
    } finally {
      if (options?.replaceAssistantMessageId) {
        regenerateTargetRef.current = null;
      }
      if (createdChatId) {
        router.replace(`/${locale}/chat/${createdChatId}`);
      }
    }
  };

  const submit = async () => submitMessage(value);

  const handleStopGeneration = () => {
    abortControllerRef.current?.abort();
    clearStreamingState();
  };

  const handleCopyMessage = async (content: string) => {
    const copied = await copyToClipboard(content);

    if (copied) {
      toast.success(t('chat.copySuccess'));
      return;
    }

    toast.error(t('chat.copyError'));
  };

  const dropMessagesFrom = (messageId: string) => {
    if (!activeChatId) return;
    queryClient.setQueryData(['chat', activeChatId], (previous: unknown) => {
      const current = previous as {messages?: ChatMessage[]} | undefined;
      if (!current?.messages) return previous;
      const index = current.messages.findIndex((item) => item.id === messageId);
      if (index < 0) return previous;
      return {...current, messages: current.messages.slice(0, index)};
    });
  };

  const handleEditMessage = (message: ChatMessage) => {
    editingMessageIdRef.current = message.id;
    setValue(message.content);
    setFocusTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const deletedChatId = actions.remove.variables;
    if (!deletedChatId || !actions.remove.isSuccess || !activeChatId) return;
    if (deletedChatId !== activeChatId) return;

    queryClient.removeQueries({ queryKey: ['chat', deletedChatId] });
    queryClient.invalidateQueries({ queryKey: ['chats'] });
    router.replace(`/${locale}/chat`);
  }, [
    actions.remove.isSuccess,
    actions.remove.variables,
    activeChatId,
    locale,
    queryClient,
    router
  ]);

  const handleRegenerate = async (targetMessage: ChatMessage) => {
    if (targetMessage.role !== 'assistant' || sendMutation.isPending) return;

    const currentMessages = chat?.messages ?? [];
    const targetIndex = currentMessages.findIndex(
      (message) => message.id === targetMessage.id
    );
    if (targetIndex <= 0) return;

    const previousUserMessage = currentMessages[targetIndex - 1];
    if (previousUserMessage?.role !== 'user') return;

    regenerateTargetRef.current = {
      userId: previousUserMessage.id,
      assistantId: targetMessage.id
    };

    await submitMessage(previousUserMessage.content, previousUserMessage.id, {
      replaceAssistantMessageId: targetMessage.id,
      restoreAssistantMessage: targetMessage
    });
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <div className="hidden h-full shrink-0 lg:block">
        <Sidebar locale={locale} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent className="h-[100dvh] w-[304px] p-0 sm:max-w-[304px] lg:hidden">
          <Sidebar locale={locale} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>

        <main id="main-content" className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex min-h-14 items-center border-0 bg-transparent py-1 sm:h-14 sm:py-0">
            <div className="pointer-events-none absolute inset-0 backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black_58%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_58%,transparent_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[hsl(var(--background))] via-[hsl(var(--background)/0.82)] to-transparent" />
            <div className="pointer-events-auto relative mx-auto flex w-full max-w-3xl items-center px-3 sm:px-6">
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
              <h1 className="max-w-[min(32rem,68%)] truncate rounded-full px-3 text-center text-sm font-semibold leading-6 text-foreground/90 sm:max-w-[min(32rem,72%)] sm:px-4 md:text-base">
                {headerTitle}
              </h1>
            </div>
          </header>

          {!isOnline ? (
            <div role="status" className="mt-14 bg-[hsl(var(--warning-surface,var(--info-surface)))] px-4 py-2 text-sm text-[hsl(var(--warning-text))]">
              <div className="mx-auto w-full max-w-3xl">{t('chat.offline')}</div>
            </div>
          ) : null}

          <LayoutGroup>
            <section className="min-h-0 flex-1 overflow-hidden">
              {isChatLoading ? (
                <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-6 pt-20 sm:px-6">
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
                  thinkLevel={thinkLevel}
                  onThinkLevelChange={handleThinkLevelChange}
                  onPromptSelect={(prompt) => {
                    void submitMessage(prompt);
                  }}
                />
              ) : (
                <div className="h-full w-full">
                  <MessageList
                    messages={messages}
                    typing={sendMutation.isPending && !streamContent}
                    onCopyMessage={handleCopyMessage}
                    onEditMessage={handleEditMessage}
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
              <div className="sticky bottom-0 z-10 border-t border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))]/95 py-2 backdrop-blur sm:py-3 md:py-4">
                <div className="mx-auto w-full max-w-3xl px-3 sm:px-6">
                  <Composer
                    value={value}
                    onChange={setValue}
                    onSubmit={submit}
                    disabled={
                      sendMutation.isPending || actions.create.isPending
                    }
                    isSending={sendMutation.isPending}
                    onStop={handleStopGeneration}
                    focusTrigger={focusTrigger}
                    thinkLevel={thinkLevel}
                    onThinkLevelChange={handleThinkLevelChange}
                  />
                </div>
              </div>
            ) : null}
          </LayoutGroup>

          <SohaFooter />
        </main>
      </Sheet>
    </div>
  );
}
