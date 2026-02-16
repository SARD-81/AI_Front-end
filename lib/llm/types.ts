export type LlmMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type SendStreamingChatOptions = {
  model?: string;
  temperature?: number;
};

export type SendStreamingChatInput = {
  messages: LlmMessage[];
  options?: SendStreamingChatOptions;
};

export interface LlmProvider {
  sendStreamingChat(
    input: SendStreamingChatInput,
    onToken: (token: string) => void,
    onDone: () => void
  ): Promise<void>;
}
