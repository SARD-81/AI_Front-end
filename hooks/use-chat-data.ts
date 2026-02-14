'use client';

import {useMemo} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import type {ChatDetail, ChatMessage, ChatSummary, SendMessagePayload} from '@/lib/api/chat';
import {
  createChat,
  deleteChat,
  getChatById,
  getChats,
  renameChat,
  sendMessageStreaming
} from '@/lib/api/chat-service';

const USE_LOCAL_MOCKS = true;

const now = new Date();

const mockChats: ChatSummary[] = [
  {id: '1', title: 'برنامه‌ریزی سفر شیراز', updatedAt: now.toISOString()},
  {id: '2', title: 'ایده‌های تولید محتوا', updatedAt: new Date(now.getTime() - 86400000 * 4).toISOString()},
  {id: '3', title: 'مرور TypeScript', updatedAt: new Date(now.getTime() - 86400000 * 36).toISOString()}
];

const mockMessages: Record<string, ChatMessage[]> = {
  '1': [
    {id: 'm1', role: 'assistant', content: 'سلام! برای سفر شیراز چه سبک برنامه‌ای مد نظر دارید؟', createdAt: now.toISOString()},
    {id: 'm2', role: 'user', content: 'سه روز زمان دارم و دوست دارم فرهنگی باشد.', createdAt: now.toISOString()}
  ],
  '2': [{id: 'm3', role: 'assistant', content: 'می‌تونیم تقویم هفتگی محتوا بچینیم.', createdAt: now.toISOString()}],
  '3': [{id: 'm4', role: 'assistant', content: 'TypeScript را از Generics شروع کنیم؟', createdAt: now.toISOString()}]
};

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: async () => (USE_LOCAL_MOCKS ? mockChats : getChats())
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
      if (USE_LOCAL_MOCKS) {
        const chat = mockChats.find((item) => item.id === chatId);
        return {
          id: chatId,
          title: chat?.title ?? 'گفت‌وگو',
          messages: mockMessages[chatId] ?? []
        };
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
    mutationFn: async ({payload, onToken}: {payload: SendMessagePayload; onToken: (chunk: string) => void}) => {
      if (USE_LOCAL_MOCKS) {
        const phrase = 'حتماً. این یک پاسخ نمونه‌ی تدریجی برای نمایش است.';
        for (const char of phrase) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          onToken(char);
        }
        return;
      }
      return sendMessageStreaming(chatId, payload, onToken, () => undefined);
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
      mutationFn: async () => (USE_LOCAL_MOCKS ? mockChats[0] : createChat()),
      onSuccess: () => queryClient.invalidateQueries({queryKey: ['chats']})
    }),
    rename: useMutation({
      mutationFn: ({chatId, title}: {chatId: string; title: string}) =>
        USE_LOCAL_MOCKS ? Promise.resolve(undefined) : renameChat(chatId, title).then(() => undefined),
      onSuccess: () => queryClient.invalidateQueries({queryKey: ['chats']})
    }),
    remove: useMutation({
      mutationFn: (chatId: string) => (USE_LOCAL_MOCKS ? Promise.resolve(undefined) : deleteChat(chatId)),
      onSuccess: () => queryClient.invalidateQueries({queryKey: ['chats']})
    })
  };
}
