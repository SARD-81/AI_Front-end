import {apiFetch, resolveApiUrl} from './client';
import {API_ENDPOINTS} from '@/lib/config/api-endpoints';
import type {ChatDetail, ChatSummary, SendMessagePayload} from './chat';

const IS_DEV = process.env.NODE_ENV !== 'production';
const STREAM_ERROR_FA_MESSAGE = 'استریم پاسخ از سرور ناموفق بود. لطفاً دوباره تلاش کنید.';
const COMPLETE_ERROR_FA_MESSAGE = 'پاسخ کامل از سرور دریافت نشد. لطفاً دوباره تلاش کنید.';

type ChatCompletionRequest = {
  model?: string;
  messages: Array<{role: 'user'; content: string}>;
  temperature: number;
  max_tokens: number;
  thinkingLevel: SendMessagePayload['thinkingLevel'];
};

type RouteErrorPayload = {
  error?: {
    message?: string;
  };
  message?: string;
};

export type AppendMessageInput = {
  role: 'user' | 'assistant';
  content: string;
  providerRequestId?: string;
};

export type StreamResult = {
  providerRequestId?: string;
};

export type CompleteResult = {
  content: string;
  providerRequestId?: string;
};

function buildCompletionPayload(payload: SendMessagePayload): ChatCompletionRequest {
  return {
    model: 'openai/gpt-4o-mini',
    messages: [{role: 'user', content: payload.content}],
    temperature: 0.7,
    max_tokens: 1024,
    thinkingLevel: payload.thinkingLevel
    // TODO(BACKEND): map thinkingLevel to provider parameters
  };
}

async function parseRouteError(response: Response, fallbackMessage: string) {
  try {
    const payload = (await response.json()) as RouteErrorPayload;
    const message = payload.error?.message?.trim() || payload.message?.trim();

    return message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function debugLog(message: string, details?: Record<string, unknown>) {
  if (!IS_DEV) return;
  if (details) {
    console.debug(`[chat-service] ${message}`, details);
    return;
  }
  console.debug(`[chat-service] ${message}`);
}

function readProviderRequestId(headers: Headers) {
  return headers.get('X-Request-Id') ?? headers.get('x-request-id') ?? undefined;
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

export async function sendMessageComplete(payload: SendMessagePayload): Promise<CompleteResult> {
  const requestPayload = buildCompletionPayload(payload);
  const endpoint = resolveApiUrl(API_ENDPOINTS.complete);

  debugLog('calling endpoint', {endpoint, mode: 'complete'});

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(requestPayload)
  });

  const providerRequestId = readProviderRequestId(response.headers);

  if (!response.ok) {
    const completeErrorMessage = await parseRouteError(response, COMPLETE_ERROR_FA_MESSAGE);
    throw new Error(completeErrorMessage);
  }

  const completion = (await response.json()) as {
    choices?: Array<{message?: {content?: string}; text?: string}>;
    content?: string;
  };

  return {
    content: completion.content ?? completion.choices?.[0]?.message?.content ?? completion.choices?.[0]?.text ?? '',
    providerRequestId
  };
}

export async function sendMessageStreaming(
  _chatId: string,
  payload: SendMessagePayload,
  onToken: (token: string) => void,
  onDone: () => void
): Promise<StreamResult> {
  const requestPayload = buildCompletionPayload(payload);
  const endpoint = resolveApiUrl(API_ENDPOINTS.stream);

  debugLog('calling endpoint', {endpoint, mode: 'stream'});

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(requestPayload)
  });

  const providerRequestId = readProviderRequestId(response.headers);

  if (!response.ok || !response.body) {
    const streamErrorMessage = await parseRouteError(response, STREAM_ERROR_FA_MESSAGE);
    throw new Error(streamErrorMessage);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const {value, done} = await reader.read();
    if (done) {
      const rest = decoder.decode();
      if (rest) onToken(rest);
      onDone();
      break;
    }
    onToken(decoder.decode(value, {stream: true}));
  }

  return {providerRequestId};
}

// TODO(BACKEND): ensure backend CORS allows your frontend origin (e.g., deployed Vercel domain).
