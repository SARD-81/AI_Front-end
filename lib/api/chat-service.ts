import {apiFetch} from './client';
import type {ChatDetail, ChatSummary, SendMessagePayload} from './chat';

const DEFAULT_MODEL = 'gpt-oss-120b-aws-bedrock';
const STREAM_ENDPOINT = '/api/chat/stream';
const COMPLETE_ENDPOINT = '/api/chat/complete';
const IS_DEV = process.env.NODE_ENV !== 'production';

type ChatCompletionRequest = {
  model: string;
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

function buildCompletionPayload(payload: SendMessagePayload): ChatCompletionRequest {
  return {
    model: DEFAULT_MODEL,
    messages: [{role: 'user', content: payload.content}],
    temperature: 0.7,
    max_tokens: 1024,
    thinkingLevel: payload.thinkingLevel
    // TODO(BACKEND): map thinkingLevel to provider parameters
  };
}

async function parseRouteError(response: Response) {
  const fallbackMessage = 'ارتباط با سرویس گفتگو برقرار نشد. لطفاً دوباره تلاش کنید.';

  try {
    const payload = (await response.json()) as RouteErrorPayload;
    return payload.error?.message?.trim() || fallbackMessage;
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

export async function sendMessage(chatId: string, payload: SendMessagePayload) {
  return apiFetch<ChatDetail>(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function sendMessageStreaming(
  _chatId: string,
  payload: SendMessagePayload,
  onToken: (token: string) => void,
  onDone: () => void
) {
  const requestPayload = buildCompletionPayload(payload);

  debugLog('calling endpoint', {endpoint: STREAM_ENDPOINT, mode: 'stream'});
  const response = await fetch(STREAM_ENDPOINT, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(requestPayload)
  });

  if (IS_DEV) {
    debugLog('stream response headers', {
      endpoint: STREAM_ENDPOINT,
      backendProvider: response.headers.get('X-Backend-Provider')
    });
  }

  if (!response.ok || !response.body) {
    const streamErrorMessage = await parseRouteError(response);
    debugLog('stream failed; fallback triggered', {
      endpoint: STREAM_ENDPOINT,
      status: response.status,
      hasBody: Boolean(response.body)
    });

    debugLog('calling endpoint', {endpoint: COMPLETE_ENDPOINT, mode: 'fallback-complete'});
    const fallbackResponse = await fetch(COMPLETE_ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(requestPayload)
    });

    if (IS_DEV) {
      debugLog('complete response headers', {
        endpoint: COMPLETE_ENDPOINT,
        backendProvider: fallbackResponse.headers.get('X-Backend-Provider')
      });
    }

    if (!fallbackResponse.ok) {
      const completeErrorMessage = await parseRouteError(fallbackResponse);
      throw new Error(completeErrorMessage || streamErrorMessage);
    }

    const completion = (await fallbackResponse.json()) as {
      choices?: Array<{message?: {content?: string}; text?: string}>;
    };

    const content = completion.choices?.[0]?.message?.content ?? completion.choices?.[0]?.text ?? '';
    if (content) {
      onToken(content);
    }
    onDone();
    return;
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
}
