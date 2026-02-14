import { endpoints } from '@/data/http/endpoints';
import { HttpClient } from '@/data/http/httpClient';
import type { ChatRepository } from '@/domain/ports/ChatRepository';
import type { Message, Thread } from '@/domain/types/chat';

export class HttpChatRepository implements ChatRepository {
  constructor(private readonly client: HttpClient) {}

  getThreads(query?: string): Promise<Thread[]> {
    const suffix = query ? `?query=${encodeURIComponent(query)}` : '';
    return this.client.request<Thread[]>(`${endpoints.threads}${suffix}`);
  }

  createThread(title?: string): Promise<Thread> {
    return this.client.request<Thread>(endpoints.threads, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  renameThread(threadId: string, title: string): Promise<Thread> {
    return this.client.request<Thread>(endpoints.threadById(threadId), {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  deleteThread(threadId: string): Promise<void> {
    return this.client.request<void>(endpoints.threadById(threadId), {
      method: 'DELETE',
    });
  }

  getMessages(threadId: string): Promise<Message[]> {
    return this.client.request<Message[]>(endpoints.threadMessages(threadId));
  }
}
