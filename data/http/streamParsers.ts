export interface StreamParser {
  parse(chunk: string): string[];
  flush?(): string[];
}

export class PlainTextStreamParser implements StreamParser {
  parse(chunk: string): string[] {
    return [chunk];
  }
}

export class JsonLineStreamParser implements StreamParser {
  private buffer = '';

  parse(chunk: string): string[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    // TODO(BE): Backend may send JSON Lines: one JSON object per line.
    // Example expected shape: {"delta":"..."}
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

export class SseLikeStreamParser implements StreamParser {
  private buffer = '';

  parse(chunk: string): string[] {
    this.buffer += chunk;
    const frames = this.buffer.split('\n\n');
    this.buffer = frames.pop() ?? '';

    // TODO(BE): If backend sends SSE-like frames over POST, parse lines starting with "data:".
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
