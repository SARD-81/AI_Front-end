export interface StreamParser {
  parse(chunk: string): string[];
  flush?(): string[];
}

export class parsePlainTextChunks implements StreamParser {
  parse(chunk: string): string[] {
    return [chunk];
  }
}

export class parseJsonLines implements StreamParser {
  private buffer = '';

  parse(chunk: string): string[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    // TODO(BE): Define JSONL framing fields for deltas, tool calls and done markers.
    return lines
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parsed = JSON.parse(line) as { delta?: string };
        return parsed.delta ?? '';
      });
  }

  flush(): string[] {
    if (!this.buffer.trim()) {
      return [];
    }
    const parsed = JSON.parse(this.buffer) as { delta?: string };
    this.buffer = '';
    return [parsed.delta ?? ''];
  }
}

export class parseSSEFrames implements StreamParser {
  private buffer = '';

  parse(chunk: string): string[] {
    this.buffer += chunk;
    const frames = this.buffer.split('\n\n');
    this.buffer = frames.pop() ?? '';

    // TODO(BE): Confirm SSE event schema including error/done markers and tool blocks.
    return frames.flatMap((frame) =>
      frame
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.replace(/^data:\s?/, '')),
    );
  }

  flush(): string[] {
    return [];
  }
}
