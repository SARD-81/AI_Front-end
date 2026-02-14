import { HttpChatRepository } from '@/data/http/chatRepository.http';
import { HttpClient } from '@/data/http/httpClient';
import { FetchStreamTransport } from '@/data/http/streamTransport.fetch';
import { parseJsonLines, parsePlainTextChunks, parseSSEFrames } from '@/data/http/streamParsers';
import { LocalSettingsRepository } from '@/data/local/settingsRepository.local';
import { MockUploadRepository } from '@/data/local/uploadRepository.mock';
import { ConsoleTelemetry } from '@/data/telemetry/telemetry.console';
import type { AuthProvider } from '@/domain/ports/AuthProvider';
import type { ChatRepository } from '@/domain/ports/ChatRepository';
import type { SettingsRepository } from '@/domain/ports/SettingsRepository';
import type { StreamTransport } from '@/domain/ports/StreamTransport';
import type { Telemetry } from '@/domain/ports/Telemetry';
import type { UploadRepository } from '@/domain/ports/UploadRepository';
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
  settingsRepository: SettingsRepository;
  telemetry: Telemetry;
  uploadRepository: UploadRepository;
}

const authProvider = new StoreAuthProvider();
const httpClient = new HttpClient(env.apiBaseUrl, authProvider);

const streamParser =
  env.streamParser === 'jsonl'
    ? new parseJsonLines()
    : env.streamParser === 'sse'
      ? new parseSSEFrames()
      : new parsePlainTextChunks();

export const container: AppContainer = {
  chatRepository: new HttpChatRepository(httpClient),
  streamTransport: new FetchStreamTransport(env.apiBaseUrl, authProvider, streamParser),
  settingsRepository: new LocalSettingsRepository(),
  telemetry: new ConsoleTelemetry(),
  uploadRepository: new MockUploadRepository(),
};
