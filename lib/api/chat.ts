export type ChatSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type MessageRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  isStreaming?: boolean;
  avalaiRequestId?: string;
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
};
