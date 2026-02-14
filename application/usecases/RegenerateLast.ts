import type { ChatMessage, ChatSettings } from "@/domain/types/chat";
import { SendMessageAndStream } from "./SendMessageAndStream";

export class RegenerateLast {
  constructor(private readonly sendUseCase: SendMessageAndStream) {}

  execute(input: {
    threadId: string;
    messages: ChatMessage[];
    settings: ChatSettings;
    signal?: AbortSignal;
    onEvent: Parameters<SendMessageAndStream["execute"]>[0]["onEvent"];
  }) {
    const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return Promise.resolve();
    return this.sendUseCase.execute({
      threadId: input.threadId,
      content: lastUser.content,
      settings: input.settings,
      signal: input.signal,
      onEvent: input.onEvent,
    });
  }
}
