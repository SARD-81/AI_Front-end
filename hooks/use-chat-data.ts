'use client';

import {useMemo} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {toast} from 'sonner';
import type {ChatDetail, ChatMessage, ChatSummary, SendMessagePayload} from '@/lib/api/chat';
import {
  appendMessages,
  createChat,
  deleteChat,
  getChatById,
  getChats,
  renameChat,
  sendMessageStreaming
} from '@/lib/api/chat-service';
import {uid} from '@/lib/utils/uid';

const IS_DEV = process.env.NODE_ENV !== 'production';
const EMPTY_RESPONSE_MESSAGE = 'پاسخ خالی دریافت شد. لطفاً دوباره تلاش کنید.';

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
        id: uid('user'),
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

      await appendMessages(chatId, [{role: 'user', content: payload.content}]);
      if (IS_DEV) console.debug('[chat-send] user message persisted', {chatId});

      let finalText = '';
      try {
        if (IS_DEV) console.debug('[chat-send] streaming started', {chatId});
        await sendMessageStreaming(
          chatId,
          payload,
          (chunk) => {
            finalText += chunk;
            onToken(chunk);
          },
          () => {
            if (IS_DEV) {
              console.debug('[chat-send] streaming ended with length', {chatId, length: finalText.length});
            }
          }
        );
      } catch (streamError) {
        const message = streamError instanceof Error ? streamError.message : 'ارتباط با مدل برقرار نشد.';
        toast.error(message);
        throw new Error(message);
      }

      const assistantContent = finalText.trim();

      if (!assistantContent) {
        toast.error(EMPTY_RESPONSE_MESSAGE);
        throw new Error(EMPTY_RESPONSE_MESSAGE);
      }

      await appendMessages(chatId, [
        {
          role: 'assistant',
          content: assistantContent
        }
      ]);

      const assistantMessage: ChatMessage = {
        id: uid('assistant'),
        role: 'assistant',
        content: assistantContent,
        createdAt: new Date().toISOString()
      };

      queryClient.setQueryData<ChatDetail>(['chat', chatId], (previous) => {
        const base = previous ?? {id: chatId, title: 'گفت‌وگو', messages: []};
        return {...base, messages: [...base.messages, assistantMessage]};
      });
      queryClient.setQueryData<ChatSummary[]>(['chats'], (previous) => upsertChatSummary(previous, chatId));

      if (IS_DEV) console.debug('[chat-send] assistant committed', {chatId});

      return {assistantCommitted: true};
    }
  });
}

export function useChatActions() {
  const queryClient = useQueryClient();

  const createFallbackChat = (title?: string): ChatSummary => ({
    id: uid(),
    title: title ?? 'گفت‌وگوی جدید',
    updatedAt: new Date().toISOString()
  });

  return {
    create: useMutation({
      mutationFn: async ({title}: {title?: string} = {}) => {
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
      mutationFn: ({chatId, title}: {chatId: string; title: string}) => renameChat(chatId, title).then(() => undefined),
      onSuccess: () => queryClient.invalidateQueries({queryKey: ['chats']})
    }),
    remove: useMutation({
      mutationFn: (chatId: string) => deleteChat(chatId),
      onSuccess: (_data, chatId) => {
        queryClient.setQueryData<ChatSummary[]>(['chats'], (previous) =>
          (previous ?? []).filter((item) => item.id !== chatId)
        );
        queryClient.removeQueries({queryKey: ['chat', chatId]});
      }
    })
  };
}
