import type { ChatMessage, ChatSettings, ChatThread } from "@/domain/types/chat";
import type { CursorPage } from "@/domain/types/api";

export interface ChatRepository {
  listThreads(): Promise<CursorPage<ChatThread>>;
  createThread(title?: string): Promise<ChatThread>;
  renameThread(threadId: string, title: string): Promise<void>;
  deleteThread(threadId: string): Promise<void>;
  getMessages(threadId: string): Promise<ChatMessage[]>;
  sendMessage(input: {
    threadId: string;
    content: string;
    settings: ChatSettings;
    attachments?: File[];
  }): Promise<{ messageId: string }>;
  // TODO(BE): Add feedback/report/share endpoints once API contract is ready.
}
