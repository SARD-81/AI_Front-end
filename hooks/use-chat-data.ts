'use client';

import {useMemo} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import type {ChatDetail, ChatSummary, SendMessagePayload} from '@/lib/api/chat';
import {
  appendMessages,
  createChat,
  deleteChat,
  getChatById,
  getChats,
  renameChat,
  sendMessageStreaming
} from '@/lib/api/chat-service';

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: getChats
  });
}

export function useChat(chatId?: string) {
  return useQuery({
    queryKey: ['chat', chatId],
    enabled: Boolean(chatId),
    queryFn: async (): Promise<ChatDetail> => {
      if (!chatId) {
        throw new Error('chatId is required');
      }
      return getChatById(chatId);
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

export function useSendMessage(chatId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payload,
      onToken,
      messages
    }: {
      payload: SendMessagePayload;
      messages: Array<{role: 'system' | 'user' | 'assistant'; content: string}>;
      onToken: (chunk: string) => void;
    }) => {
      await appendMessages(chatId, [
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: payload.content,
          createdAt: new Date().toISOString()
        }
      ]);

      const stream = await sendMessageStreaming(chatId, payload, messages, onToken);

      await appendMessages(chatId, [
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: stream.assistant,
          createdAt: new Date().toISOString(),
          avalaiRequestId: stream.avalaiRequestId ?? undefined
        }
      ]);

      return stream;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ['chat', chatId]});
      await queryClient.invalidateQueries({queryKey: ['chats']});
    }
  });
}

export function useChatActions() {
  const queryClient = useQueryClient();

  return {
    create: useMutation({
      mutationFn: ({title}: {title?: string} = {}) => createChat(title),
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
      mutationFn: ({chatId, title}: {chatId: string; title: string}) => renameChat(chatId, title).then(() => undefined),
      onSuccess: () => queryClient.invalidateQueries({queryKey: ['chats']})
    }),
    remove: useMutation({
      mutationFn: (chatId: string) => deleteChat(chatId),
      onSuccess: () => queryClient.invalidateQueries({queryKey: ['chats']})
    })
  };
}
