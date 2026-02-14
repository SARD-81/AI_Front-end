export type MessageRole = "user" | "assistant" | "tool";
export type ChatMode = "chat" | "reasoning" | "coding";

export interface ChatThread {
  id: string;
  title: string;
  updatedAt: string;
  pinned?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  payload: unknown;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  reasoning?: string;
  toolCalls?: ToolCall[];
  createdAt: string;
}

export interface ChatSettings {
  model: string;
  mode: ChatMode;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
  showReasoning: boolean;
  streaming: boolean;
  autoSave: boolean;
  multiSend: boolean;
  theme: "dark" | "light";
}

export type StreamEvent =
  | { type: "delta"; content?: string; reasoning?: string }
  | { type: "tool"; payload: unknown }
  | { type: "done"; usage?: unknown }
  | { type: "error"; error: import("./api").ApiError };
