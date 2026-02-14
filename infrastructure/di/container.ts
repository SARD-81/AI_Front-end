import { CreateThread } from "@/application/usecases/CreateThread";
import { DeleteThread } from "@/application/usecases/DeleteThread";
import { GetMessages } from "@/application/usecases/GetMessages";
import { ListThreads } from "@/application/usecases/ListThreads";
import { RegenerateLast } from "@/application/usecases/RegenerateLast";
import { RenameThread } from "@/application/usecases/RenameThread";
import { SendMessageAndStream } from "@/application/usecases/SendMessageAndStream";
import { StopStreaming } from "@/application/usecases/StopStreaming";
import type { AuthProvider } from "@/domain/ports/AuthProvider";
import { HttpChatRepository } from "@/infrastructure/http/chatRepository.http";
import { HttpClient } from "@/infrastructure/http/httpClient";
import { FetchChatStreamer, streamParsers } from "@/infrastructure/stream/chatStreamer.fetch";
import { LocalSettingsStore } from "@/infrastructure/storage/settings.local";
import { ConsoleTelemetry } from "@/infrastructure/telemetry/console";

class DemoAuthProvider implements AuthProvider {
  async getAccessToken(): Promise<string | null> {
    return null;
  }
  async refresh(): Promise<void> {
    // TODO(BE): implement token refresh request.
  }
  async signOut(): Promise<void> {
    // TODO(BE): implement remote logout + local session clear.
  }
}

const authProvider = new DemoAuthProvider();
const httpClient = new HttpClient(authProvider);
const chatRepository = new HttpChatRepository(httpClient);
const streamer = new FetchChatStreamer(authProvider, streamParsers.jsonl);

export const container = {
  telemetry: new ConsoleTelemetry(),
  settingsStore: new LocalSettingsStore(),
  chatRepository,
  usecases: {
    listThreads: new ListThreads(chatRepository),
    createThread: new CreateThread(chatRepository),
    renameThread: new RenameThread(chatRepository),
    deleteThread: new DeleteThread(chatRepository),
    getMessages: new GetMessages(chatRepository),
    sendMessageAndStream: new SendMessageAndStream(chatRepository, streamer),
    regenerateLast: new RegenerateLast(new SendMessageAndStream(chatRepository, streamer)),
    stopStreaming: new StopStreaming(),
  },
};

export type AppContainer = typeof container;
