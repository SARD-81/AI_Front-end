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
  is_liked?: boolean | null;
};

export type ChatDetail = {
  id: string;
  title: string;
  messages: ChatMessage[];
};

export type ThinkingLevel = 'standard' | 'low' | 'medium' | 'high';

export type SendMessagePayload = {
  content: string;
  deepThink: boolean;
  search: boolean;
  thinkingLevel: ThinkingLevel;
  // TODO(BACKEND): map thinkingLevel to backend parameters.
  // TODO: include attachment metadata once backend upload contract is finalized.
};
