import type { ChatSettings, StreamEvent } from "@/domain/types/chat";

export interface ChatStreamer {
  stream(input: {
    threadId: string;
    content: string;
    settings: ChatSettings;
    signal?: AbortSignal;
  }): AsyncGenerator<StreamEvent, void, void>;
}
