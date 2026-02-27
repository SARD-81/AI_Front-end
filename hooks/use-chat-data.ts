'use client';

import {useMemo} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import type {ChatDetail, ChatMessage, ChatSummary, SendMessagePayload} from '@/lib/api/chat';
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  sendMessage
} from '@/lib/services/chat-service';
import {uid} from '@/lib/utils/uid';

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
      const diffDays = Math.floor((nowDate.getTime() - new Date(chat.updatedAt).getTime()) / 86400000);
      if (diffDays < 1) today.push(chat);
      else if (diffDays <= 30) month.push(chat);
      else older.push(chat);
    });

    return {today, month, older};
  }, [chats]);
}

function upsertChatSummary(chats: ChatSummary[] | undefined, chatId: string) {
  const updatedAt = new Date().toISOString();
  const next = chats ?? [];
  const existing = next.find((item) => item.id === chatId);
  if (!existing) {
    return [{id: chatId, title: 'گفت‌وگو', updatedAt}, ...next];
  }

  const rest = next.filter((item) => item.id !== chatId);
  return [{...existing, updatedAt}, ...rest];
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({chatId, payload}: {chatId: string; payload: SendMessagePayload; onToken?: (chunk: string) => void}) => {
      const nowIso = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: uid('user'),
        role: 'user',
        content: payload.content,
        createdAt: nowIso
      };

      queryClient.setQueryData<ChatDetail>(['chat', chatId], (previous) => {
        const base = previous ?? {id: chatId, title: 'گفت‌وگو', messages: []};
        return {...base, messages: [...base.messages, userMessage]};
      });
      queryClient.setQueryData<ChatSummary[]>(['chats'], (previous) => upsertChatSummary(previous, chatId));

      const assistantMessage = await sendMessage(chatId, payload.content);

      queryClient.setQueryData<ChatDetail>(['chat', chatId], (previous) => {
        const base = previous ?? {id: chatId, title: 'گفت‌وگو', messages: []};
        return {...base, messages: [...base.messages, assistantMessage]};
      });
      queryClient.setQueryData<ChatSummary[]>(['chats'], (previous) => upsertChatSummary(previous, chatId));

      return {assistantCommitted: true};
    }
  });
}

export function useChatActions() {
  const queryClient = useQueryClient();

  return {
    create: useMutation({
      mutationFn: async (_payload: {title?: string} = {}) => createConversation(),
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
      mutationFn: ({chatId, title}: {chatId: string; title: string}) => renameConversation(chatId, title),
      onSuccess: () => queryClient.invalidateQueries({queryKey: ['chats']})
    }),
    remove: useMutation({
      mutationFn: (chatId: string) => deleteConversation(chatId),
      onSuccess: (_data, chatId) => {
        queryClient.setQueryData<ChatSummary[]>(['chats'], (previous) =>
          (previous ?? []).filter((item) => item.id !== chatId)
        );
        queryClient.removeQueries({queryKey: ['chat', chatId]});
      }
    })
  };
}
