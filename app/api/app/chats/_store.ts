import type {ChatMessage, ChatSummary} from '@/lib/api/chat';
import {uid} from '@/lib/utils/uid';

type ChatRecord = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
};

type ChatStore = {
  chats: Map<string, ChatRecord>;
};

declare global {
  // eslint-disable-next-line no-var
  var __chatStore: ChatStore | undefined;
}

function getStore(): ChatStore {
  if (!globalThis.__chatStore) {
    globalThis.__chatStore = {chats: new Map<string, ChatRecord>()};
  }

  return globalThis.__chatStore;
}

export function listChatSummaries(): ChatSummary[] {
  return Array.from(getStore().chats.values())
    .map(({id, title, updatedAt}) => ({id, title, updatedAt}))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function createChat(title?: string): ChatSummary {
  const now = new Date().toISOString();
  const id = uid('chat');
  const record: ChatRecord = {
    id,
    title: title?.trim() || 'گفت‌وگو',
    updatedAt: now,
    messages: []
  };

  getStore().chats.set(id, record);

  return {id: record.id, title: record.title, updatedAt: record.updatedAt};
}

export function getChat(chatId: string): ChatRecord | null {
  return getStore().chats.get(chatId) ?? null;
}

export function renameChat(chatId: string, title: string): ChatSummary | null {
  const record = getStore().chats.get(chatId);

  if (!record) return null;

  record.title = title.trim() || 'گفت‌وگو';
  record.updatedAt = new Date().toISOString();

  return {id: record.id, title: record.title, updatedAt: record.updatedAt};
}

export function deleteChat(chatId: string): boolean {
  return getStore().chats.delete(chatId);
}

export type AppendInputMessage = Pick<ChatMessage, 'role' | 'content'>;

export function appendMessages(chatId: string, messages: AppendInputMessage[]) {
  const record = getStore().chats.get(chatId);
  if (!record) return null;

  const now = new Date().toISOString();
  const appended = messages.map((message) => ({
    id: uid(message.role),
    role: message.role,
    content: message.content,
    createdAt: now
  } as ChatMessage));

  record.messages.push(...appended);
  record.updatedAt = now;

  return {
    id: chatId,
    appended
  };
}
