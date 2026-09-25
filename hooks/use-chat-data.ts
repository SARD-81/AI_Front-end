'use client';

import { useEffect, useMemo } from 'react';
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
  getConversationWindow,
  getHistoryPage,
  listConversations,
  renameConversation,
  sendMessageWithWebSocket,
  ChatWebSocketError
} from '@/lib/services/chat-service';
import {prependHistory} from '@/lib/chat/history';
import {groupChatsByDate} from '@/lib/chat/group-chats';
import { uuid } from '@/lib/utils/uid';
import { revealAnswerProgressively } from '@/lib/chat/reveal-answer';

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
    staleTime: Infinity,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    queryFn: async ({signal}): Promise<ChatDetail> => {
      if (!chatId) throw new Error('chatId is required');
      return getConversationWindow(chatId, {signal});
    }
  });
}

export function useOlderMessages(chatId?: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: ['older-history', chatId],
    retry: false,
    mutationFn: async () => {
      if (!chatId) return;
      const cursor = queryClient.getQueryData<ChatDetail>(['chat', chatId])?.olderCursor;
      if (!cursor) return;
      // fetchQuery deduplicates concurrent requests for this exact page.
      const page = await queryClient.fetchQuery({
        queryKey: ['history-page', chatId, cursor],
        queryFn: ({signal}) => getHistoryPage(chatId, cursor, signal),
        staleTime: Infinity,
        retry: false
      });
      if (page.olderCursor === cursor) throw new Error('Repeated history cursor');
      queryClient.setQueryData<ChatDetail>(['chat', chatId], current =>
        current ? prependHistory(current, cursor, page) : current
      );
    }
  });
  const {reset} = mutation;
  useEffect(() => { reset(); }, [chatId, reset]);
  return mutation;
}

export function useGroupedChats(chats: ChatSummary[] | undefined) {
  return useMemo(() => groupChatsByDate(chats ?? []), [chats]);
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
    retry: false,
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
      // An older HTTP snapshot must not overwrite this submission's cache writes.
      await queryClient.cancelQueries({queryKey: ['chat', chatId], exact: true}, {revert: false});
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
        const assistantMessage = await sendMessageWithWebSocket(
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

        await revealAnswerProgressively(
          assistantMessage.content,
          onToken,
          signal
        );

        await queryClient.cancelQueries({queryKey: ['chat', chatId], exact: true}, {revert: false});
        if (signal?.aborted) throw new ChatWebSocketError('Response generation was stopped.', 'ABORTED');
        queryClient.setQueryData<ChatDetail>(['chat', chatId], (previous) => {
          const base = previous ?? {
            id: chatId,
            title: fallbackTitle,
            messages: []
          };
          // A background read may have completed while the backend was answering.
          const withUser = base.messages.some(message => message.id === userMessage.id)
            ? base.messages
            : [...base.messages, userMessage];
          const messagesWithSentUser = withUser.map((message) =>
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

        return { assistantCommitted: true };
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
                  sendStatus:
                    signal?.aborted || replaceAssistantMessageId
                      ? ('sent' as const)
                      : ('failed' as const)
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
      retry: false,
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
