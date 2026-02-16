import {apiFetch} from './client';
import type {ChatDetail, ChatSummary, SendMessagePayload} from './chat';

const STREAM_ENDPOINT = '/api/chat/stream';
const COMPLETE_ENDPOINT = '/api/chat/complete';
const IS_DEV = process.env.NODE_ENV !== 'production';

const MODEL_NOT_FOUND_FA_MESSAGE =
  'مدل انتخاب‌شده در OpenRouter در دسترس نیست. مقدار OPENROUTER_DEFAULT_MODEL یا مدل ارسالی را بررسی کنید.';

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

function isModelNotFoundMessage(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('model') && (normalized.includes('not found') || normalized.includes('does not exist'));
}

async function parseRouteError(response: Response) {
  const fallbackMessage = 'ارتباط با سرویس گفتگو برقرار نشد. لطفاً دوباره تلاش کنید.';

  try {
    const payload = (await response.json()) as RouteErrorPayload;
    const message = payload.error?.message?.trim() || fallbackMessage;

    if (response.status === 404 || isModelNotFoundMessage(message)) {
      return MODEL_NOT_FOUND_FA_MESSAGE;
    }

    return message;
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
  return headers.get('X-Request-Id') ?? headers.get('x-openrouter-request-id') ?? undefined;
}

export async function getChats() {
  return apiFetch<ChatSummary[]>('/chats');
}

export async function getChatById(chatId: string) {
  return apiFetch<ChatDetail>(`/chats/${chatId}`);
}

export async function createChat() {
  return apiFetch<ChatSummary>('/chats', {method: 'POST'});
}

export async function renameChat(chatId: string, title: string) {
  return apiFetch<ChatSummary>(`/chats/${chatId}`, {
    method: 'PATCH',
    body: JSON.stringify({title})
  });
}

export async function deleteChat(chatId: string) {
  return apiFetch<void>(`/chats/${chatId}`, {method: 'DELETE'});
}

export async function appendMessages(chatId: string, messages: AppendMessageInput[]) {
  return apiFetch<{
    id: string;
    appended: Array<AppendMessageInput & {id: string; chatId: string; createdAt: string}>;
  }>(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({messages})
  });
}

export async function sendMessage(chatId: string, payload: SendMessagePayload) {
  return apiFetch<ChatDetail>(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function sendMessageComplete(payload: SendMessagePayload): Promise<CompleteResult> {
  const requestPayload = buildCompletionPayload(payload);

  debugLog('calling endpoint', {endpoint: COMPLETE_ENDPOINT, mode: 'complete'});
  const response = await fetch(COMPLETE_ENDPOINT, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(requestPayload)
  });

  const providerRequestId = readProviderRequestId(response.headers);

  if (IS_DEV) {
    debugLog('complete response headers', {
      endpoint: COMPLETE_ENDPOINT,
      llmProvider: response.headers.get('X-LLM-Provider'),
      modelUsed: response.headers.get('X-Model-Used'),
      providerRequestId
    });
  }

  if (!response.ok) {
    const completeErrorMessage = await parseRouteError(response);
    throw new Error(completeErrorMessage);
  }

  const completion = (await response.json()) as {
    choices?: Array<{message?: {content?: string}; text?: string}>;
  };

  return {
    content: completion.choices?.[0]?.message?.content ?? completion.choices?.[0]?.text ?? '',
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

  debugLog('calling endpoint', {endpoint: STREAM_ENDPOINT, mode: 'stream'});
  const response = await fetch(STREAM_ENDPOINT, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(requestPayload)
  });

  const providerRequestId = readProviderRequestId(response.headers);

  if (IS_DEV) {
    debugLog('stream response headers', {
      endpoint: STREAM_ENDPOINT,
      llmProvider: response.headers.get('X-LLM-Provider'),
      modelUsed: response.headers.get('X-Model-Used'),
      providerRequestId
    });
  }

  if (!response.ok || !response.body) {
    const streamErrorMessage = await parseRouteError(response);
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
