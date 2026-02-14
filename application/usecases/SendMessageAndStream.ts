import type { ChatRepository } from "@/domain/ports/ChatRepository";
import type { ChatStreamer } from "@/domain/ports/ChatStreamer";
import type { ChatSettings, StreamEvent } from "@/domain/types/chat";

export class SendMessageAndStream {
  constructor(
    private readonly repo: ChatRepository,
    private readonly streamer: ChatStreamer,
  ) {}

  async execute(input: {
    threadId: string;
    content: string;
    settings: ChatSettings;
    attachments?: File[];
    signal?: AbortSignal;
    onEvent: (event: StreamEvent) => void;
  }) {
    await this.repo.sendMessage({
      threadId: input.threadId,
      content: input.content,
      settings: input.settings,
      attachments: input.attachments,
    });

    for await (const event of this.streamer.stream({
      threadId: input.threadId,
      content: input.content,
      settings: input.settings,
      signal: input.signal,
    })) {
      input.onEvent(event);
    }
  }
}
