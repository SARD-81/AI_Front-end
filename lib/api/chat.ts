export type ChatSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type MessageRole = 'user' | 'assistant';
export type MessageSendStatus = 'pending' | 'failed' | 'sent';

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  isStreaming?: boolean;
  sendStatus?: MessageSendStatus;
  is_liked?: boolean | null;
};

export type ChatDetail = {
  id: string;
  title: string;
  messages: ChatMessage[];
};

export type ThinkingLevel = 'low' | 'medium' | 'high';

export type SendMessagePayload = {
  content: string;
  thinkLevel: ThinkingLevel;
  clientMessageId?: string;
};

export type FeedbackReasonCategory = 'inaccurate' | 'irrelevant' | 'tone' | 'incomplete' | 'other';

export type MessageFeedbackPayload = {
  is_liked: boolean | null;
  reason_category: FeedbackReasonCategory | null;
  text_comment: string;
};
