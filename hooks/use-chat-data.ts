'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ChatDetail,
  ChatMessage,
  ChatSummary,
  SendMessagePayload
} from '@/lib/api/chat';
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  sendMessage,
  sendMessageWithWebSocket,
  ChatWebSocketError
} from '@/lib/services/chat-service';
import { uuid } from '@/lib/utils/uid';

const isChatRestFallbackEnabled = () =>
  process.env.NEXT_PUBLIC_CHAT_REST_FALLBACK !== 'false';

const STREAM_REVEAL_TICK_MS = 28;
const STREAM_REVEAL_MAX_MS = 2200;
const STREAM_REVEAL_MIN_LENGTH = 48;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * The backend WebSocket delivers the whole answer in a single message.
 * To keep the UI feeling live (like ChatGPT), reveal the received answer
 * progressively before committing it to the cache. Skipped for short
 * answers and for users who prefer reduced motion.
 */
async function revealAnswerProgressively(
  text: string,
  onToken?: (chunk: string) => void
) {
  if (!onToken || text.length < STREAM_REVEAL_MIN_LENGTH) return;
  if (prefersReducedMotion()) return;

  const maxSteps = Math.floor(STREAM_REVEAL_MAX_MS / STREAM_REVEAL_TICK_MS);
  const steps = Math.max(1, Math.min(maxSteps, Math.ceil(text.length / 3)));
  const chunkSize = Math.ceil(text.length / steps);

  for (let index = 0; index < text.length; index += chunkSize) {
    onToken(text.slice(index, index + chunkSize));
    await new Promise((resolve) => setTimeout(resolve, STREAM_REVEAL_TICK_MS));
  }
}

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    staleTime: 15_000,
    queryFn: listConversations
  });
}

export function useChat(chatId?: string) {
  return useQuery({
    queryKey: ['chat', chatId],
    enabled: Boolean(chatId),
    staleTime: 15_000,
    queryFn: async (): Promise<ChatDetail> => {
      if (!chatId) throw new Error('chatId is required');
      return getConversation(chatId);
    }
  });
}

export function useGroupedChats(chats: ChatSummary[] | undefined) {
  return useMemo(() => {
    const today: ChatSummary[] = [];
    const month: ChatSummary[] = [];
    const older: ChatSummary[] = [];

    const nowDate = new Date();
    chats?.forEach((chat) => {
      const diffDays = Math.floor(
        (nowDate.getTime() - new Date(chat.updatedAt).getTime()) / 86400000
      );
      if (diffDays < 1) today.push(chat);
      else if (diffDays <= 30) month.push(chat);
      else older.push(chat);
    });

    return { today, month, older };
  }, [chats]);
}

function upsertChatSummary(
  chats: ChatSummary[] | undefined,
  chatId: string,
  fallbackTitle = ''
) {
  const updatedAt = new Date().toISOString();
  const next = chats ?? [];
  const existing = next.find((item) => item.id === chatId);
  if (!existing) {
    return [{ id: chatId, title: fallbackTitle, updatedAt }, ...next];
  }

  const rest = next.filter((item) => item.id !== chatId);
  return [{ ...existing, updatedAt }, ...rest];
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chatId,
      payload,
      clientMessageId,
      replaceAssistantMessageId,
      restoreAssistantMessage,
      onToken,
      signal,
      fallbackTitle = ''
    }: {
      chatId: string;
      payload: SendMessagePayload;
      clientMessageId?: string;
      replaceAssistantMessageId?: string;
      restoreAssistantMessage?: ChatMessage;
      onToken?: (chunk: string) => void;
      signal?: AbortSignal;
      fallbackTitle?: string;
    }) => {
      const nowIso = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: clientMessageId ?? uuid(),
        role: 'user',
        content: payload.content,
        createdAt: nowIso,
        sendStatus: 'pending'
      };

      queryClient.setQueryData<ChatDetail>(['chat', chatId], (previous) => {
        const base = previous ?? { id: chatId, title: fallbackTitle, messages: [] };
        const messagesWithoutTarget = replaceAssistantMessageId
          ? base.messages.filter((message) => message.id !== replaceAssistantMessageId)
          : base.messages;
        const existing = messagesWithoutTarget.find(
          (message) => message.id === userMessage.id
        );
        if (existing) {
          return {
            ...base,
            messages: messagesWithoutTarget.map((message) =>
              message.id === userMessage.id
                ? {
                    ...message,
                    content: payload.content,
                    sendStatus: 'pending'
                  }
                : message
            )
          };
        }
        return { ...base, messages: [...messagesWithoutTarget, userMessage] };
      });
      queryClient.setQueryData<ChatSummary[]>(['chats'], (previous) =>
        upsertChatSummary(previous, chatId)
      );

      try {
        let assistantMessage: ChatMessage;
        let wsError: unknown;

        try {
          assistantMessage = await sendMessageWithWebSocket(
            chatId,
            {
              ...payload,
              clientMessageId: userMessage.id
            },
            {
              signal,
              onAck: () => {
                queryClient.setQueryData<ChatDetail>(['chat', chatId], (previous) => {
                  const base = previous ?? {
                    id: chatId,
                    title: fallbackTitle,
                    messages: []
                  };
                  return {
                    ...base,
                    messages: base.messages.map((message) =>
                      message.id === userMessage.id
                        ? { ...message, sendStatus: 'pending' as const }
                        : message
                    )
                  };
                });
              }
            }
          );
        } catch (error) {
          wsError = error;

          if (
            error instanceof ChatWebSocketError &&
            (error.shouldRedirectToProfile ||
              error.isLocked ||
              error.closeCode === 4401 ||
              error.closeCode === 4404)
          ) {
            throw error;
          }

          if (signal?.aborted || !isChatRestFallbackEnabled()) {
            throw error;
          }

          assistantMessage = await sendMessage(chatId, {
            ...payload,
            clientMessageId: userMessage.id
          });
        }

        if (!signal?.aborted) {
          await revealAnswerProgressively(assistantMessage.content, onToken);
        }

        queryClient.setQueryData<ChatDetail>(['chat', chatId], (previous) => {
          const base = previous ?? {
            id: chatId,
            title: fallbackTitle,
            messages: []
          };
          const messagesWithSentUser = base.messages.map((message) =>
            message.id === userMessage.id
              ? { ...message, sendStatus: 'sent' as const }
              : message
          );
          if (messagesWithSentUser.some((message) => message.id === assistantMessage.id)) {
            return { ...base, messages: messagesWithSentUser };
          }

          const userIndex = messagesWithSentUser.findIndex(
            (message) => message.id === userMessage.id
          );
          if (replaceAssistantMessageId && userIndex >= 0) {
            return {
              ...base,
              messages: [
                ...messagesWithSentUser.slice(0, userIndex + 1),
                assistantMessage,
                ...messagesWithSentUser.slice(userIndex + 1)
              ]
            };
          }

          return {
            ...base,
            messages: [...messagesWithSentUser, assistantMessage]
          };
        });
        queryClient.setQueryData<ChatSummary[]>(['chats'], (previous) =>
          upsertChatSummary(previous, chatId, fallbackTitle)
        );

        return { assistantCommitted: true, usedRestFallback: Boolean(wsError) };
      } catch (error) {
        queryClient.setQueryData<ChatDetail>(['chat', chatId], (previous) => {
          const base = previous ?? {
            id: chatId,
            title: fallbackTitle,
            messages: []
          };
          const messagesWithUserRestored = base.messages.map((message) =>
            message.id === userMessage.id
              ? {
                  ...message,
                  sendStatus: replaceAssistantMessageId ? ('sent' as const) : ('failed' as const)
                }
              : message
          );

          if (replaceAssistantMessageId && restoreAssistantMessage) {
            const userIndex = messagesWithUserRestored.findIndex(
              (message) => message.id === userMessage.id
            );
            const alreadyRestored = messagesWithUserRestored.some(
              (message) => message.id === restoreAssistantMessage.id
            );
            if (userIndex >= 0 && !alreadyRestored) {
              return {
                ...base,
                messages: [
                  ...messagesWithUserRestored.slice(0, userIndex + 1),
                  restoreAssistantMessage,
                  ...messagesWithUserRestored.slice(userIndex + 1)
                ]
              };
            }
          }

          return {
            ...base,
            messages: messagesWithUserRestored
          };
        });
        throw error;
      }
    }
  });
}

export function useChatActions() {
  const queryClient = useQueryClient();

  return {
    create: useMutation({
      mutationFn: async (payload: { title?: string } = {}) =>
        createConversation(payload.title),
      onSuccess: (chat) => {
        queryClient.setQueryData<ChatSummary[]>(['chats'], (previous) => {
          const next = previous ?? [];
          if (next.some((item) => item.id === chat.id)) return next;
          return [chat, ...next];
        });
        queryClient.setQueryData<ChatDetail>(['chat', chat.id], {
          id: chat.id,
          title: chat.title,
          messages: []
        });
      }
    }),
    rename: useMutation({
      mutationFn: ({ chatId, title }: { chatId: string; title: string }) =>
        renameConversation(chatId, title),
      onSuccess: (chat) => {
        queryClient.setQueryData<ChatSummary[]>(['chats'], (previous) =>
          (previous ?? []).map((item) =>
            item.id === chat.id ? { ...item, title: chat.title, updatedAt: chat.updatedAt } : item
          )
        );
        queryClient.setQueryData<ChatDetail>(['chat', chat.id], (previous) =>
          previous ? { ...previous, title: chat.title } : previous
        );
      }
    }),
    remove: useMutation({
      mutationFn: (chatId: string) => deleteConversation(chatId),
      onSuccess: (_data, chatId) => {
        queryClient.setQueryData<ChatSummary[]>(['chats'], (previous) =>
          (previous ?? []).filter((item) => item.id !== chatId)
        );
        queryClient.removeQueries({ queryKey: ['chat', chatId] });
      }
    })
  };
}