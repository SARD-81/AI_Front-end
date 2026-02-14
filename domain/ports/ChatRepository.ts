import type { Message, Thread } from '@/domain/types/chat';

export interface ChatRepository {
  getThreads(query?: string): Promise<Thread[]>;
  createThread(title?: string): Promise<Thread>;
  renameThread(threadId: string, title: string): Promise<Thread>;
  deleteThread(threadId: string): Promise<void>;
  getMessages(threadId: string): Promise<Message[]>;
}
