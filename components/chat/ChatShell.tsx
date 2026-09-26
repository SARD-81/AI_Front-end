'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutGroup } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ConversationsPanel } from '@/components/sidebar/ConversationsPanel';
import { ServicesRail } from '@/components/sidebar/ServicesRail';
import { SohaFooter } from '@/components/layout/SohaFooter';
import { Skeleton } from '@/components/ui/skeleton';
import { MessagesSquare, PanelsTopLeft } from 'lucide-react';
import { Composer } from './Composer';
import { MessageList } from './MessageList';
import { ChatEmptyState } from './ChatEmptyState';
import {
  useChat,
  useChatActions,
  useSendMessage,
  useOlderMessages
} from '@/hooks/use-chat-data';
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
  const [mobilePanel, setMobilePanel] = useState<
    'services' | 'conversations' | null
  >(null);
  const [servicesCollapsed, setServicesCollapsed] = useState(false);
  const [conversationsOpen, setConversationsOpen] = useState(true);
  const queryClient = useQueryClient();
  const editingMessageIdRef = useRef<string | null>(null);
  const [value, setValue] = useState('');
  const [streamContent, setStreamContent] = useState('');
  const streamChunksRef = useRef<string[]>([]);
  const streamFrameRef = useRef<number | null>(null);
  const streamCreatedAtRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const submissionInFlightRef = useRef(false);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [, setErrorMessage] = useState('');
  const isOnline = useOnlineStatus();
  const [hasSubmittedMessage, setHasSubmittedMessage] = useState(false);
  const [thinkLevel, setThinkLevel] = useState<ThinkingLevel>('low');
  const [webSearchOn, setWebSearchOn] = useState(false);
  const [activeChatId, setActiveChatId] = useState(chatId);
  const regenerateTargetRef = useRef<{
    userId: string;
    assistantId: string;
  } | null>(null);

  const chatQuery = useChat(activeChatId);
  const chat = chatQuery.data;
  const olderHistory = useOlderMessages(activeChatId);
  const actions = useChatActions();
  const sendMutation = useSendMessage();

  useEffect(() => {
    setActiveChatId(chatId);
  }, [chatId]);

  const handleThinkLevelChange = (nextLevel: ThinkingLevel) => {
    setThinkLevel(nextLevel);
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
  const isChatLoading = Boolean(activeChatId) && !chat && chatQuery.isFetching;
  const isSendingOrStreaming = sendMutation.isPending || Boolean(streamContent);
  const hasMessages = messages.length > 0;
  const shouldShowEmptyState =
    !isChatLoading &&
    !isSendingOrStreaming &&
    !hasMessages &&
    !hasSubmittedMessage;

  const getChatUserErrorMessage = (error: unknown) => {
    if (error instanceof ChatWebSocketError) {
      if (
        error.shouldRedirectToProfile ||
        error.code === 'PROFILE_INCOMPLETE'
      ) {
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

      return t('chat.linkLost');
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

      if (
        error.name === 'AbortError' ||
        normalizedMessage.includes('timeout')
      ) {
        return t('chat.timeout');
      }

      if (
        error.name === 'TypeError' ||
        normalizedMessage.includes('fetch') ||
        normalizedMessage.includes('network') ||
        normalizedMessage.includes('websocket') ||
        normalizedMessage.includes('connection')
      ) {
        return t('chat.linkLost');
      }
    }

    return t('chat.unknownSendError');
  };

  const submitMessage = async (
    nextValue: string,
    clientMessageId?: string,
    options?: {
      clearComposer?: boolean;
      replaceAssistantMessageId?: string;
      restoreAssistantMessage?: ChatMessage;
    }
  ) => {
    const trimmedValue = nextValue.trim();
    if (
      !trimmedValue ||
      submissionInFlightRef.current ||
      sendMutation.isPending ||
      actions.create.isPending
    )
      return;

    submissionInFlightRef.current = true;
    // Clear only a submitted draft, before either creation or generation waits.
    // Regenerate must leave any unrelated composer draft intact.
    if (options?.clearComposer) setValue('');

    const stableClientMessageId = clientMessageId ?? uuid();
    const payload = {
      content: nextValue,
      thinkLevel,
      webSearch: webSearchOn,
      clientMessageId: stableClientMessageId
    };

    const editedMessageId = options?.clearComposer
      ? editingMessageIdRef.current
      : null;
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
        const created = await actions.create.mutateAsync({
          title: t('newChat')
        });
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
        // The WebSocket exchange is already committed. Do not replace it with
        // an immediate history snapshot; only refresh sidebar metadata here.
        queryClient.invalidateQueries({ queryKey: ['chats'] });
      }
      abortControllerRef.current = null;
    } catch (error) {
      clearStreamingState();
      if (!resolvedChatId && options?.clearComposer) {
        // No failed message exists yet when conversation creation fails.
        setValue((current) => current || nextValue);
        setHasSubmittedMessage(false);
      }
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

      if (
        error instanceof ChatWebSocketError &&
        error.shouldRedirectToProfile
      ) {
        router.push(`/${locale}/profile`);
      }

      const friendlyError = getChatUserErrorMessage(error);
      setErrorMessage(friendlyError);
      toast.error(friendlyError);
    } finally {
      submissionInFlightRef.current = false;
      if (options?.replaceAssistantMessageId) {
        regenerateTargetRef.current = null;
      }
      if (createdChatId) {
        router.replace(`/${locale}/chat/${createdChatId}`);
      }
    }
  };

  const submit = async () =>
    submitMessage(value, undefined, { clearComposer: true });

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
      const current = previous as { messages?: ChatMessage[] } | undefined;
      if (!current?.messages) return previous;
      const index = current.messages.findIndex((item) => item.id === messageId);
      if (index < 0) return previous;
      return { ...current, messages: current.messages.slice(0, index) };
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

  const isRtl = locale === 'fa';
  const openServices = () => setMobilePanel('services');
  const openConversations = () => {
    setMobilePanel('conversations');
    setConversationsOpen(true);
  };
  const closeConversations = () => {
    setMobilePanel((current) => (current === 'conversations' ? null : current));
    setConversationsOpen(false);
  };

  const services = (
    <ServicesRail
      locale={locale}
      collapsed={servicesCollapsed}
      mobileOpen={mobilePanel === 'services'}
      onClose={() => setMobilePanel(null)}
      onToggleCollapsed={() => setServicesCollapsed((current) => !current)}
    />
  );
  const conversations = (
    <ConversationsPanel
      locale={locale}
      mobileOpen={mobilePanel === 'conversations'}
      desktopOpen={conversationsOpen}
      onClose={closeConversations}
    />
  );
  const conversationPane = (
    <main
      id="main-content"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_0%,hsl(var(--accent)/0.55),transparent_46%)]"
    >
      {!conversationsOpen ? (
        <button
          type="button"
          className="absolute left-3 top-3 z-20 hidden h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-card)/0.96)] text-foreground shadow-md transition-colors hover:bg-[hsl(var(--surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] xl:inline-flex"
          aria-label={t('conversations.open')}
          aria-controls="conversations-panel"
          onClick={openConversations}
        >
          <MessagesSquare className="h-5 w-5" />
        </button>
      ) : null}

      <div className="flex shrink-0 items-center justify-between px-2 pt-2 xl:hidden" dir="ltr">
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-foreground hover:bg-[hsl(var(--surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))]"
          aria-label={t('conversations.open')}
          aria-controls="conversations-panel"
          onClick={openConversations}
        >
          <MessagesSquare className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-foreground hover:bg-[hsl(var(--surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] md:hidden"
          aria-label={t('services.open')}
          aria-controls="services-panel"
          onClick={openServices}
        >
          <PanelsTopLeft className="h-5 w-5" />
        </button>
      </div>

      {!isOnline ? (
        <div
          role="status"
          className="bg-[hsl(var(--warning-surface,var(--info-surface)))] px-4 py-2 text-sm text-[hsl(var(--warning-text))]"
        >
          <div className="mx-auto w-full max-w-3xl">{t('chat.offline')}</div>
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
              onPromptSelect={(prompt) => {
                void submitMessage(prompt, undefined, { clearComposer: true });
              }}
            />
          ) : (
            <div className="h-full w-full">
              <MessageList
                key={activeChatId}
                hasOlder={Boolean(chat?.olderCursor)}
                loadingOlder={olderHistory.isPending}
                olderError={olderHistory.isError}
                historyStartIndex={chat?.historyStartIndex}
                onLoadOlder={() => {
                  if (!olderHistory.isPending) olderHistory.mutate();
                }}
                messages={messages}
                typing={sendMutation.isPending && !streamContent}
                onCopyMessage={handleCopyMessage}
                onEditMessage={handleEditMessage}
                onRegenerate={handleRegenerate}
                onRestoreMessage={(message) => {
                  setValue(message.content);
                  setFocusTrigger((prev) => prev + 1);
                }}
              />
            </div>
          )}
        </section>

        <div className="shrink-0 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-4">
          <Composer
            value={value}
            onChange={setValue}
            onSubmit={submit}
            disabled={sendMutation.isPending || actions.create.isPending}
            isSending={sendMutation.isPending}
            onStop={handleStopGeneration}
            autoFocus={shouldShowEmptyState && shouldAutoFocus}
            focusTrigger={focusTrigger}
            thinkLevel={thinkLevel}
            onThinkLevelChange={handleThinkLevelChange}
            webSearchOn={webSearchOn}
            onWebSearchChange={setWebSearchOn}
          />
          <SohaFooter className="mt-1.5" />
        </div>
      </LayoutGroup>
    </main>
  );

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="chat-workspace flex h-[100dvh] min-h-0 overflow-hidden bg-background text-foreground"
    >
      {mobilePanel ? (
        <button
          type="button"
          aria-label={t('dialog.close')}
          className={
            mobilePanel === 'services'
              ? 'fixed inset-0 z-30 bg-foreground/30 md:hidden'
              : 'fixed inset-0 z-30 bg-foreground/30 xl:hidden'
          }
          onClick={() =>
            mobilePanel === 'services' ? setMobilePanel(null) : closeConversations()
          }
        />
      ) : null}
      {isRtl ? (
        <>
          {services}
          {conversationPane}
          {conversations}
        </>
      ) : (
        <>
          {conversations}
          {conversationPane}
          {services}
        </>
      )}
    </div>
  );
}
