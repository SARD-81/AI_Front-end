import 'server-only';

import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export type AppRole = 'system' | 'user' | 'assistant';

export type AppChat = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type AppMessage = {
  id: string;
  chatId: string;
  role: AppRole;
  content: string;
  createdAt: string;
  avalaiRequestId?: string;
};

type StoreData = {
  chats: AppChat[];
  messages: AppMessage[];
};

const dataDir = path.join(process.cwd(), '.data');
const dataFile = path.join(dataDir, 'chats.json');

let writeQueue = Promise.resolve();

async function ensureStoreFile() {
  await mkdir(dataDir, {recursive: true});
  try {
    await readFile(dataFile, 'utf8');
  } catch {
    const initial: StoreData = {chats: [], messages: []};
    await writeFile(dataFile, JSON.stringify(initial, null, 2), 'utf8');
  }
}

async function loadStore(): Promise<StoreData> {
  await ensureStoreFile();
  const raw = await readFile(dataFile, 'utf8');
  const parsed = JSON.parse(raw) as Partial<StoreData>;
  return {
    chats: parsed.chats ?? [],
    messages: parsed.messages ?? []
  };
}

function persistStore(next: StoreData) {
  writeQueue = writeQueue.then(async () => {
    await ensureStoreFile();
    await writeFile(dataFile, JSON.stringify(next, null, 2), 'utf8');
  });

  return writeQueue;
}

export async function listChats() {
  const store = await loadStore();
  return store.chats.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function createChat(title: string) {
  const store = await loadStore();
  const now = new Date().toISOString();
  const chat: AppChat = {
    id: randomUUID(),
    title,
    createdAt: now,
    updatedAt: now
  };
  store.chats.unshift(chat);
  await persistStore(store);
  return chat;
}

export async function getChat(chatId: string) {
  const store = await loadStore();
  const chat = store.chats.find((item) => item.id === chatId);
  if (!chat) return null;
  const messages = store.messages
    .filter((item) => item.chatId === chatId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return {chat, messages};
}

export async function renameChat(chatId: string, title: string) {
  const store = await loadStore();
  const chat = store.chats.find((item) => item.id === chatId);
  if (!chat) return null;
  chat.title = title;
  chat.updatedAt = new Date().toISOString();
  await persistStore(store);
  return chat;
}

export async function deleteChat(chatId: string) {
  const store = await loadStore();
  const prevLength = store.chats.length;
  store.chats = store.chats.filter((item) => item.id !== chatId);
  store.messages = store.messages.filter((item) => item.chatId !== chatId);
  await persistStore(store);
  return prevLength !== store.chats.length;
}

export async function appendMessages(
  chatId: string,
  messages: Array<{role: AppRole; content: string; avalaiRequestId?: string}>
) {
  const store = await loadStore();
  const chat = store.chats.find((item) => item.id === chatId);
  if (!chat) return null;
  const createdAt = new Date().toISOString();
  const nextMessages: AppMessage[] = messages.map((message) => ({
    id: randomUUID(),
    chatId,
    role: message.role,
    content: message.content,
    createdAt,
    avalaiRequestId: message.avalaiRequestId
  }));
  store.messages.push(...nextMessages);
  chat.updatedAt = createdAt;
  await persistStore(store);
  return nextMessages;
}
