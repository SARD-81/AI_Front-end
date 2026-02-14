import type { ChatRepository } from "@/domain/ports/ChatRepository";

export class RenameThread {
  constructor(private readonly repo: ChatRepository) {}
  execute(threadId: string, title: string) {
    return this.repo.renameThread(threadId, title);
  }
}
