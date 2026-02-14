import type { ApiError } from "@/domain/types/api";
import type { StreamEvent } from "@/domain/types/chat";

export interface ChunkParser {
  feed(chunk: string): StreamEvent[];
  flush(): StreamEvent[];
}

export class PlainTextChunkParser implements ChunkParser {
  feed(chunk: string): StreamEvent[] {
    return [{ type: "delta", content: chunk }];
  }
  flush(): StreamEvent[] {
    return [{ type: "done" }];
  }
}

export class JsonLinesParser implements ChunkParser {
  private buffer = "";
  feed(chunk: string): StreamEvent[] {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    const events: StreamEvent[] = []
    lines.forEach((line) => {
      if (!line.trim()) return;
      try {
        const parsed = JSON.parse(line);
        // TODO(BE): map backend JSONL chunk fields to StreamEvent, including delta.content and delta.reasoning_content.
        if (parsed.type === "tool") { events.push({ type: "tool", payload: parsed.payload }); return; }
        if (parsed.type === "done") { events.push({ type: "done", usage: parsed.usage }); return; }
        events.push({ type: "delta", content: parsed.content, reasoning: parsed.reasoning_content });
      } catch {
        const error: ApiError = { code: "UNKNOWN", message: "Invalid JSONL chunk" };
        events.push({ type: "error", error });
      }
    });
    return events;
  }
  flush(): StreamEvent[] {
    return [{ type: "done" }];
  }
}

export class SSEFrameParserOverPOST implements ChunkParser {
  private delegate = new JsonLinesParser();
  feed(chunk: string): StreamEvent[] {
    // TODO(BE): confirm if backend sends `data:` frames over POST stream and parse according to exact SSE framing.
    const normalized = chunk
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.replace(/^data:\s?/, ""))
      .join("\n");
    return this.delegate.feed(normalized);
  }
  flush(): StreamEvent[] {
    return this.delegate.flush();
  }
}
