import { HttpChatRepository } from '@/data/http/chatRepository.http';
import { HttpClient } from '@/data/http/httpClient';
import { FetchStreamTransport } from '@/data/http/streamTransport.fetch';
import { JsonLineStreamParser, PlainTextStreamParser, SseLikeStreamParser } from '@/data/http/streamParsers';
import type { AuthProvider } from '@/domain/ports/AuthProvider';
import type { ChatRepository } from '@/domain/ports/ChatRepository';
import type { StreamTransport } from '@/domain/ports/StreamTransport';
import { useAuthStore } from '@/store/useAuthStore';
import { env } from '@/lib/di/env';

class StoreAuthProvider implements AuthProvider {
  async getAuthContext() {
    const { token } = useAuthStore.getState();
    return { token };
  }
}

export interface AppContainer {
  chatRepository: ChatRepository;
  streamTransport: StreamTransport;
}

const authProvider = new StoreAuthProvider();
const httpClient = new HttpClient(env.apiBaseUrl, authProvider);

const streamParser =
  env.streamParser === 'jsonl'
    ? new JsonLineStreamParser()
    : env.streamParser === 'sse'
      ? new SseLikeStreamParser()
      : new PlainTextStreamParser();

// TODO(BE): For production, switch parser strategy according to backend protocol.
export const container: AppContainer = {
  chatRepository: new HttpChatRepository(httpClient),
  streamTransport: new FetchStreamTransport(env.apiBaseUrl, authProvider, streamParser),
};
