import type { AuthProvider } from "@/domain/ports/AuthProvider";
import type { ChatStreamer } from "@/domain/ports/ChatStreamer";
import type { ApiError } from "@/domain/types/api";
import type { ChatSettings, StreamEvent } from "@/domain/types/chat";
import { API_BASE_URL, ENDPOINTS } from "@/infrastructure/http/endpoints";
import { JsonLinesParser, PlainTextChunkParser, SSEFrameParserOverPOST, type ChunkParser } from "./parsers";

export class FetchChatStreamer implements ChatStreamer {
  constructor(
    private readonly auth: AuthProvider,
    private readonly parserFactory: () => ChunkParser = () => new PlainTextChunkParser(),
  ) {}

  async *stream(input: {
    threadId: string;
    content: string;
    settings: ChatSettings;
    signal?: AbortSignal;
  }): AsyncGenerator<StreamEvent> {
    const token = await this.auth.getAccessToken();
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.chat}`, {
      method: "POST",
      signal: input.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        threadId: input.threadId,
        content: input.content,
        stream: true,
        settings: input.settings,
      }),
    });

    if (!response.ok || !response.body) {
      const error: ApiError = { code: "UNKNOWN", message: "stream failed", status: response.status };
      yield { type: "error", error };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parser = this.parserFactory();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      for (const event of parser.feed(text)) yield event;
    }

    for (const event of parser.flush()) yield event;
  }
}

export const streamParsers = {
  text: () => new PlainTextChunkParser(),
  jsonl: () => new JsonLinesParser(),
  sseOverPost: () => new SSEFrameParserOverPOST(),
};
