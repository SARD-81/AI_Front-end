import {mkdir, readFile, rename, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export type StoredChat = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredMessage = {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  avalaiRequestId?: string;
};

type StoreData = {
  chats: StoredChat[];
  messages: StoredMessage[];
};

const DATA_DIR = path.join(process.cwd(), '.data');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

let writeQueue = Promise.resolve();

async function ensureDataFile(filePath: string) {
  await mkdir(DATA_DIR, {recursive: true});

  try {
    await stat(filePath);
  } catch {
    await writeFile(filePath, '[]\n', 'utf8');
  }
}

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  await ensureDataFile(filePath);
  const data = await readFile(filePath, 'utf8');

  try {
    const parsed = JSON.parse(data) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function atomicWriteJson(filePath: string, value: unknown) {
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(tempPath, payload, 'utf8');
  await rename(tempPath, filePath);
}

async function readStore(): Promise<StoreData> {
  const [chats, messages] = await Promise.all([
    readJsonArray<StoredChat>(CHATS_FILE),
    readJsonArray<StoredMessage>(MESSAGES_FILE)
  ]);

  return {chats, messages};
}

function withLock<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function writeStore(data: StoreData) {
  await Promise.all([atomicWriteJson(CHATS_FILE, data.chats), atomicWriteJson(MESSAGES_FILE, data.messages)]);
}

export async function listChats() {
  const {chats} = await readStore();
  return chats.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createChat(title?: string) {
  return withLock(async () => {
    const now = new Date().toISOString();
    const {chats, messages} = await readStore();

    const chat: StoredChat = {
      id: randomUUID(),
      title: title?.trim() || 'گفت‌وگو',
      createdAt: now,
      updatedAt: now
    };

    chats.push(chat);
    await writeStore({chats, messages});
    return chat;
  });
}

export async function getChatDetail(chatId: string) {
  const {chats, messages} = await readStore();
  const chat = chats.find((item) => item.id === chatId);
  if (!chat) return null;

  return {
    ...chat,
    messages: messages
      .filter((message) => message.chatId === chatId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  };
}

export async function renameChat(chatId: string, title: string) {
  return withLock(async () => {
    const {chats, messages} = await readStore();
    const chat = chats.find((item) => item.id === chatId);
    if (!chat) return null;

    chat.title = title.trim() || chat.title;
    chat.updatedAt = new Date().toISOString();
    await writeStore({chats, messages});
    return chat;
  });
}

export async function deleteChat(chatId: string) {
  return withLock(async () => {
    const {chats, messages} = await readStore();
    const nextChats = chats.filter((item) => item.id !== chatId);

    if (nextChats.length === chats.length) {
      return false;
    }

    const nextMessages = messages.filter((item) => item.chatId !== chatId);
    await writeStore({chats: nextChats, messages: nextMessages});
    return true;
  });
}

export async function appendMessages(
  chatId: string,
  items: Array<Pick<StoredMessage, 'role' | 'content' | 'avalaiRequestId'>>
) {
  return withLock(async () => {
    const now = new Date().toISOString();
    const {chats, messages} = await readStore();
    const chat = chats.find((item) => item.id === chatId);
    if (!chat) return null;

    const createdMessages: StoredMessage[] = items.map((item, index) => ({
      id: randomUUID(),
      chatId,
      role: item.role,
      content: item.content,
      createdAt: new Date(Date.now() + index).toISOString(),
      ...(item.avalaiRequestId ? {avalaiRequestId: item.avalaiRequestId} : {})
    }));

    chat.updatedAt = now;
    messages.push(...createdMessages);
    await writeStore({chats, messages});
    return createdMessages;
  });
}
