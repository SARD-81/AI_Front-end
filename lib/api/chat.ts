export type ChatSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type MessageRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  isStreaming?: boolean;
};

export type ChatDetail = {
  id: string;
  title: string;
  messages: ChatMessage[];
};

export type SendMessagePayload = {
  content: string;
  deepThink: boolean;
  search: boolean;
  // TODO: include attachment metadata once backend upload contract is finalized.
};
