import type { ChatRepository } from "@/domain/ports/ChatRepository";

export class ListThreads {
  constructor(private readonly repo: ChatRepository) {}
  execute() {
    return this.repo.listThreads();
  }
}
