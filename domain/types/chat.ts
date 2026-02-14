export type Role = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCall {
  name: string;
  payload: Record<string, unknown>;
}

export interface Message {
  id: string;
  threadId: string;
  role: Role;
  content: string;
  createdAt: string;
  toolCall?: ToolCall;
  error?: string;
}

export interface Thread {
  id: string;
  title: string;
  updatedAt: string;
  preview?: string;
}

export interface SendMessageInput {
  threadId: string;
  content: string;
}
