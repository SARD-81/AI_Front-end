import type { ChatRepository } from "@/domain/ports/ChatRepository";

export class DeleteThread {
  constructor(private readonly repo: ChatRepository) {}
  execute(threadId: string) {
    return this.repo.deleteThread(threadId);
  }
}
