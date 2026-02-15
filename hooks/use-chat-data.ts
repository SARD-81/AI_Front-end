'use client';

import {useMemo} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import type {ChatDetail, ChatMessage, ChatSummary, SendMessagePayload} from '@/lib/api/chat';
import {appendMessages, createChat, deleteChat, getChatById, getChats, renameChat, sendMessageStreaming} from '@/lib/api/chat-service';

const USE_LOCAL_MOCKS = process.env.NEXT_PUBLIC_USE_MOCK_CHAT === 'true';
const IS_DEV = process.env.NODE_ENV !== 'production';

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

function normalizeChatSummary(chat: (Partial<ChatSummary> & Record<string, unknown>) | undefined): ChatSummary | null {
  if (!chat) return null;

  const resolvedChat =
    (typeof chat.data === 'object' && chat.data !== null ? (chat.data as Record<string, unknown>) : undefined) ??
    (typeof chat.chat === 'object' && chat.chat !== null ? (chat.chat as Record<string, unknown>) : undefined) ??
    chat;

  const id =
    (typeof resolvedChat.id === 'string' && resolvedChat.id) ||
    (typeof resolvedChat.chatId === 'string' && resolvedChat.chatId) ||
    (typeof resolvedChat.chat_id === 'string' && resolvedChat.chat_id) ||
    null;

  if (!id) return null;

  const title =
    (typeof resolvedChat.title === 'string' && resolvedChat.title) ||
    (typeof resolvedChat.name === 'string' && resolvedChat.name) ||
    (typeof resolvedChat.chatTitle === 'string' && resolvedChat.chatTitle) ||
    'گفت‌وگو';

  const updatedAt =
    (typeof resolvedChat.updatedAt === 'string' && resolvedChat.updatedAt) ||
    (typeof resolvedChat.updated_at === 'string' && resolvedChat.updated_at) ||
    new Date().toISOString();

  return {
    id,
    title,
    updatedAt
  };
}

function normalizeChats(chats: ChatSummary[] | undefined): ChatSummary[] {
  if (!Array.isArray(chats)) return [];
  return chats
    .map((chat) => normalizeChatSummary(chat))
    .filter((chat): chat is ChatSummary => chat !== null);
}

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      if (USE_LOCAL_MOCKS) return mockChats;

      const chats = await getChats();
      return normalizeChats(chats);
    }
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
      if (!chat) return;
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
    mutationFn: async ({
      chatId,
      payload,
      onToken
    }: {
      chatId: string;
      payload: SendMessagePayload;
      onToken: (chunk: string) => void;
    }) => {
      const nowIso = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: `user-${crypto.randomUUID()}`,
        role: 'user',
        content: payload.content,
        createdAt: nowIso
      };

      queryClient.setQueryData<ChatDetail>(['chat', chatId], (previous) => {
        const base = previous ?? {id: chatId, title: 'گفت‌وگو', messages: []};
        return {
          ...base,
          messages: [...base.messages, userMessage]
        };
      });
      queryClient.setQueryData<ChatSummary[]>(['chats'], (previous) => upsertChatSummary(previous, chatId));

      if (USE_LOCAL_MOCKS) {
        const phrase = 'حتماً. این یک پاسخ نمونه‌ی تدریجی برای نمایش است.';
        const currentMessages = mockMessages[chatId] ?? [];
        mockMessages[chatId] = [...currentMessages, userMessage];

        if (IS_DEV) console.debug('[chat-send] user message persisted', {chatId});
        if (IS_DEV) console.debug('[chat-send] streaming started', {chatId});

        let finalText = '';
        for (const char of phrase) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          finalText += char;
          onToken(char);
        }

        if (IS_DEV) console.debug('[chat-send] streaming ended', {chatId, length: finalText.length});

        const assistantMessage: ChatMessage = {
          id: `assistant-${crypto.randomUUID()}`,
          role: 'assistant',
          content: finalText,
          createdAt: new Date().toISOString()
        };

        mockMessages[chatId] = [...mockMessages[chatId], assistantMessage];
        queryClient.setQueryData<ChatDetail>(['chat', chatId], (previous) => {
          const base = previous ?? {id: chatId, title: 'گفت‌وگو', messages: []};
          return {...base, messages: [...base.messages, assistantMessage]};
        });

        if (IS_DEV) console.debug('[chat-send] assistant message persisted', {chatId});

        return {assistantCommitted: true};
      }

      await appendMessages(chatId, [{role: 'user', content: payload.content}]);
      if (IS_DEV) console.debug('[chat-send] user message persisted', {chatId});

      let finalText = '';
      if (IS_DEV) console.debug('[chat-send] streaming started', {chatId});
      const streamResult = await sendMessageStreaming(
        chatId,
        payload,
        (chunk) => {
          finalText += chunk;
          onToken(chunk);
        },
        () => {
          if (IS_DEV) console.debug('[chat-send] streaming ended', {chatId, length: finalText.length});
        }
      );

      const trimmed = finalText.trim();
      if (!trimmed) {
        return {assistantCommitted: false};
      }

      await appendMessages(chatId, [
        {
          role: 'assistant',
          content: trimmed,
          avalaiRequestId: streamResult.avalaiRequestId
        }
      ]);


      const assistantMessage: ChatMessage = {
        id: `assistant-${crypto.randomUUID()}`,
        role: 'assistant',
        content: trimmed,
        createdAt: new Date().toISOString()
      };

      queryClient.setQueryData<ChatDetail>(['chat', chatId], (previous) => {
        const base = previous ?? {id: chatId, title: 'گفت‌وگو', messages: []};
        return {...base, messages: [...base.messages, assistantMessage]};
      });
      queryClient.setQueryData<ChatSummary[]>(['chats'], (previous) => upsertChatSummary(previous, chatId));

      if (IS_DEV) console.debug('[chat-send] assistant message persisted', {chatId});

      return {assistantCommitted: true};
    },
    onSettled: async (_data, _error, variables) => {
      await queryClient.invalidateQueries({queryKey: ['chat', variables.chatId]});
      await queryClient.invalidateQueries({queryKey: ['chats']});
    }
  });
}

export function useChatActions() {
  const queryClient = useQueryClient();

  const createFallbackChat = (title?: string): ChatSummary => ({
    id: crypto.randomUUID(),
    title: title ?? 'گفت‌وگوی جدید',
    updatedAt: new Date().toISOString()
  });

  return {
    create: useMutation({
      mutationFn: async ({title}: {title?: string} = {}) => {
        if (USE_LOCAL_MOCKS) {
          const item = createFallbackChat(title);
          mockChats.unshift(item);
          mockMessages[item.id] = [];
          return item;
        }
        try {
          const createdChat = (await createChat()) as Partial<ChatSummary> & Record<string, unknown>;
          const normalizedChat = normalizeChatSummary(createdChat);

          if (normalizedChat) {
            return normalizedChat;
          }
        } catch {
          // fallback below keeps chat UX working when chat CRUD backend is not fully wired.
        }

        return createFallbackChat(title);
      },
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
      mutationFn: ({chatId, title}: {chatId: string; title: string}) => {
        if (USE_LOCAL_MOCKS) {
          const chat = mockChats.find((item) => item.id === chatId);
          if (chat) {
            chat.title = title;
            chat.updatedAt = new Date().toISOString();
          }
          return Promise.resolve(undefined);
        }
        return renameChat(chatId, title).then(() => undefined);
      },
      onSuccess: () => queryClient.invalidateQueries({queryKey: ['chats']})
    }),
    remove: useMutation({
      mutationFn: (chatId: string) => {
        if (USE_LOCAL_MOCKS) {
          const index = mockChats.findIndex((item) => item.id === chatId);
          if (index >= 0) mockChats.splice(index, 1);
          delete mockMessages[chatId];
          return Promise.resolve(undefined);
        }
        return deleteChat(chatId);
      },
      onSuccess: (_data, chatId) => {
        queryClient.setQueryData<ChatSummary[]>(['chats'], (previous) =>
          (previous ?? []).filter((item) => item.id !== chatId)
        );
        queryClient.removeQueries({queryKey: ['chat', chatId]});
      }
    })
  };
}
