export type ChatSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type MessageRole = 'user' | 'assistant';
export type MessageSendStatus = 'pending' | 'failed' | 'sent';

export type AiResource = {
  position?: number;
  datasetId?: string;
  datasetName?: string;
  documentId?: string | null;
  documentName?: string | null;
  segmentId?: string;
  score?: number;
  content?: string;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  isStreaming?: boolean;
  sendStatus?: MessageSendStatus;
  is_liked?: boolean | null;
  aiResources?: AiResource[];
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
  // Nullable per the backend contract: null (or an omitted value) clears the
  // stored comment, and empty strings are stored as null server-side.
  text_comment: string | null;
};
