import type {LlmProvider, SendStreamingChatInput} from '@/lib/llm/types';
import {logBackendHint} from '@/lib/config/llm';

const BACKEND_NOT_READY_MESSAGE = 'بک‌اند هنوز آماده نیست. برای دمو، DEMO_MODE را فعال کنید.';

export class BackendPlaceholderProvider implements LlmProvider {
  async sendStreamingChat(input: SendStreamingChatInput, onToken: (token: string) => void, onDone: () => void) {
    void input;
    void onToken;
    void onDone;
    logBackendHint();
    throw new Error(BACKEND_NOT_READY_MESSAGE);
  }
}
