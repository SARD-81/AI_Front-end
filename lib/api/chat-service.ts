import {apiFetch} from './client';
import type {ChatDetail, ChatSummary, SendMessagePayload} from './chat';

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
  chatId: string,
  payload: SendMessagePayload,
  onToken: (token: string) => void,
  onDone: () => void
) {
  // TODO: define BASE_URL usage once backend endpoint is ready.
  const response = await fetch(`/chats/${chatId}/messages/stream`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
    // TODO: include auth strategy matching apiFetch.
  });

  if (!response.body || !response.ok) {
    throw new Error('Streaming request failed.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  // TODO: backend must specify exact stream format (SSE, JSONL, or plain text chunks).
  // TODO: backend must specify explicit end-of-stream signal if not relying on stream close.
  while (true) {
    const {value, done} = await reader.read();
    if (done) {
      onDone();
      break;
    }
    onToken(decoder.decode(value, {stream: true}));
  }
}
