import {apiFetch} from './client';
import type {ChatDetail, ChatSummary, SendMessagePayload} from './chat';

const DEFAULT_MODEL = 'gpt-oss-120b-aws-bedrock';

type ChatCompletionRequest = {
  model: string;
  messages: Array<{role: 'user'; content: string}>;
  temperature: number;
  max_tokens: number;
  thinkingLevel: SendMessagePayload['thinkingLevel'];
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

export async function getChats() {
  // TODO: wire GET /chats
  return apiFetch<ChatSummary[]>('/chats');
}

export async function getChatById(chatId: string) {
  // TODO: wire GET /chats/:id
  return apiFetch<ChatDetail>(`/chats/${chatId}`);
}

export async function createChat() {
  // TODO: wire POST /chats
  return apiFetch<ChatSummary>('/chats', {method: 'POST'});
}

export async function renameChat(chatId: string, title: string) {
  // TODO: wire PATCH /chats/:id
  return apiFetch<ChatSummary>(`/chats/${chatId}`, {
    method: 'PATCH',
    body: JSON.stringify({title})
  });
}

export async function deleteChat(chatId: string) {
  // TODO: wire DELETE /chats/:id
  return apiFetch<void>(`/chats/${chatId}`, {method: 'DELETE'});
}

export async function sendMessage(chatId: string, payload: SendMessagePayload) {
  // TODO: wire POST /chats/:id/messages
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

  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok || !response.body) {
    const fallbackResponse = await fetch('/api/chat/complete', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(requestPayload)
    });

    if (!fallbackResponse.ok) {
      throw new Error('ارسال پیام ناموفق بود. لطفاً دوباره تلاش کنید.');
    }

    const completion = (await fallbackResponse.json()) as {
      choices?: Array<{message?: {content?: string}}>;
    };

    const content = completion.choices?.[0]?.message?.content ?? '';
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
      onDone();
      break;
    }
    onToken(decoder.decode(value, {stream: true}));
  }
}
