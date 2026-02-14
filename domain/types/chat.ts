export type Role = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCall {
  name: string;
  payload: Record<string, unknown>;
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  previewUrl?: string;
  uploadedUrl?: string;
}

export interface MessageMetrics {
  latencyMs?: number;
  ttftMs?: number;
  tokensIn?: number;
  tokensOut?: number;
}

export interface MessageSafety {
  blocked?: boolean;
  redacted?: boolean;
  flags?: string[];
}

export interface Message {
  id: string;
  threadId: string;
  role: Role;
  content: string;
  createdAt: string;
  toolCall?: ToolCall;
  error?: string;
  status?: 'ok' | 'stopped' | 'error';
  model?: string;
  correlationId?: string;
  metrics?: MessageMetrics;
  safety?: MessageSafety;
  rawToolCalls?: unknown;
  attachments?: Attachment[];
  pinned?: boolean;
}

export interface Thread {
  id: string;
  title: string;
  updatedAt: string;
  preview?: string;
  tags?: string[];
  note?: string;
  isStreaming?: boolean;
  pinnedMessageIds?: string[];
  model?: string;
}

export interface ThreadMessagesPage {
  items: Message[];
  nextCursor?: string;
}

export interface SendMessageInput {
  threadId: string;
  content: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  provider: string;
}

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  category: 'کار' | 'شخصی' | 'تحقیق' | 'باگ';
}
