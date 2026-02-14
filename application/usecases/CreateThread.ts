import type { ChatRepository } from "@/domain/ports/ChatRepository";

export class CreateThread {
  constructor(private readonly repo: ChatRepository) {}
  execute(title?: string) {
    return this.repo.createThread(title);
  }
}
