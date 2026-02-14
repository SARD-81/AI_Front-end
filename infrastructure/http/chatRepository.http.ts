import type { ChatRepository } from "@/domain/ports/ChatRepository";
import type { CursorPage } from "@/domain/types/api";
import type { ChatMessage, ChatSettings, ChatThread } from "@/domain/types/chat";
import { ENDPOINTS } from "./endpoints";
import { HttpClient } from "./httpClient";

export class HttpChatRepository implements ChatRepository {
  constructor(private readonly client: HttpClient) {}

  listThreads(): Promise<CursorPage<ChatThread>> {
    return this.client.request(ENDPOINTS.threads);
  }

  createThread(title?: string): Promise<ChatThread> {
    return this.client.request(ENDPOINTS.threads, {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  }

  renameThread(threadId: string, title: string): Promise<void> {
    return this.client.request(ENDPOINTS.threadById(threadId), {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  }

  deleteThread(threadId: string): Promise<void> {
    return this.client.request(ENDPOINTS.threadById(threadId), { method: "DELETE" });
  }

  getMessages(threadId: string): Promise<ChatMessage[]> {
    return this.client.request(ENDPOINTS.messagesByThread(threadId));
  }

  sendMessage(input: {
    threadId: string;
    content: string;
    settings: ChatSettings;
    attachments?: File[];
  }): Promise<{ messageId: string }> {
    return this.client.request(ENDPOINTS.chat, {
      method: "POST",
      body: JSON.stringify({
        threadId: input.threadId,
        content: input.content,
        settings: input.settings,
        // TODO(BE): map requested model/mode/temperature/top_p/max_tokens to backend payload schema.
        // TODO(BE): implement multipart upload endpoint and attach file IDs instead of File objects.
      }),
    });
  }
}
