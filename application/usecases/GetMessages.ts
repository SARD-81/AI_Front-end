import type { ChatRepository } from "@/domain/ports/ChatRepository";

export class GetMessages {
  constructor(private readonly repo: ChatRepository) {}
  execute(threadId: string) {
    return this.repo.getMessages(threadId);
  }
}
