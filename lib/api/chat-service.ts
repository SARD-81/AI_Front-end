import {apiFetch} from './client';
import {API_ENDPOINTS} from '@/lib/config/api-endpoints';
import type {ChatDetail, ChatSummary, SendMessagePayload} from './chat';
import {getLlmProvider} from '@/lib/llm';
import type {LlmMessage} from '@/lib/llm/types';

const IS_DEV = process.env.NODE_ENV !== 'production';

export type AppendMessageInput = {
  role: 'user' | 'assistant';
  content: string;
  providerRequestId?: string;
};

function debugLog(message: string, details?: Record<string, unknown>) {
  if (!IS_DEV) return;
  if (details) {
    console.debug(`[chat-service] ${message}`, details);
    return;
  }
  console.debug(`[chat-service] ${message}`);
}

function toProviderMessages(payload: SendMessagePayload): LlmMessage[] {
  return [{role: 'user', content: payload.content}];
}

export async function getChats() {
  return apiFetch<ChatSummary[]>(API_ENDPOINTS.chatsBase);
}

export async function getChatById(chatId: string) {
  return apiFetch<ChatDetail>(API_ENDPOINTS.chatById(chatId));
}

export async function createChat() {
  return apiFetch<ChatSummary>(API_ENDPOINTS.chatsBase, {method: 'POST'});
}

export async function renameChat(chatId: string, title: string) {
  return apiFetch<ChatSummary>(API_ENDPOINTS.chatById(chatId), {
    method: 'PATCH',
    body: JSON.stringify({title})
  });
}

export async function deleteChat(chatId: string) {
  return apiFetch<void>(API_ENDPOINTS.chatById(chatId), {method: 'DELETE'});
}

export async function appendMessages(chatId: string, messages: AppendMessageInput[]) {
  return apiFetch<{
    id: string;
    appended: Array<AppendMessageInput & {id: string; chatId: string; createdAt: string}>;
  }>(API_ENDPOINTS.chatMessages(chatId), {
    method: 'POST',
    body: JSON.stringify({messages})
  });
}

export async function sendMessage(chatId: string, payload: SendMessagePayload) {
  return apiFetch<ChatDetail>(API_ENDPOINTS.chatMessages(chatId), {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function sendMessageStreaming(
  _chatId: string,
  payload: SendMessagePayload,
  onToken: (token: string) => void,
  onDone: () => void
): Promise<void> {
  const provider = getLlmProvider();

  debugLog('provider sendStreamingChat', {
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE,
    model: process.env.NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL ?? 'openai/gpt-4o-mini'
  });

  await provider.sendStreamingChat(
    {
      messages: toProviderMessages(payload),
      options: {
        model: process.env.NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL,
        temperature: 0.7
      }
    },
    onToken,
    onDone
  );
}

