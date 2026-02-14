import { endpoints } from '@/data/http/endpoints';
import type { AuthProvider } from '@/domain/ports/AuthProvider';
import type { StreamTransport } from '@/domain/ports/StreamTransport';
import type { StreamParser } from '@/data/http/streamParsers';

export class FetchStreamTransport implements StreamTransport {
  constructor(
    private readonly baseUrl: string,
    private readonly authProvider: AuthProvider,
    private readonly parser: StreamParser,
  ) {}

  async streamChat(
    payload: Record<string, unknown>,
    { signal, onDelta, onDone, onError }: Parameters<StreamTransport['streamChat']>[1],
  ): Promise<void> {
    try {
      const auth = await this.authProvider.getAuthContext();
      const headers = new Headers({ 'Content-Type': 'application/json' });

      // TODO(BE): Confirm auth transport. Could be cookies with credentials: 'include'.
      if (auth.token) {
        headers.set('Authorization', `Bearer ${auth.token}`);
      }

      const response = await fetch(`${this.baseUrl}${endpoints.chat}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Streaming failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        for (const delta of this.parser.parse(chunk)) {
          onDelta(delta);
        }
      }

      if (this.parser.flush) {
        for (const delta of this.parser.flush()) {
          onDelta(delta);
        }
      }

      onDone();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        onDone();
        return;
      }
      onError(error as Error);
    }
  }
}
