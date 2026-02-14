import {apiFetch, ApiError} from './client';
import type {ChatDetail, ChatMessage, ChatSummary, SendMessagePayload} from './chat';

export async function getChats() {
  return apiFetch<ChatSummary[]>('/api/app/chats');
}

export async function getChatById(chatId: string) {
  return apiFetch<ChatDetail>(`/api/app/chats/${chatId}`);
}

export async function createChat(title?: string) {
  return apiFetch<ChatSummary>('/api/app/chats', {
    method: 'POST',
    body: JSON.stringify({title})
  });
}

export async function renameChat(chatId: string, title: string) {
  return apiFetch<ChatSummary>(`/api/app/chats/${chatId}`, {
    method: 'PATCH',
    body: JSON.stringify({title})
  });
}

export async function deleteChat(chatId: string) {
  return apiFetch<void>(`/api/app/chats/${chatId}`, {method: 'DELETE'});
}

export async function appendMessages(chatId: string, messages: ChatMessage[]) {
  return apiFetch<ChatMessage[]>(`/api/app/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
        avalaiRequestId: message.avalaiRequestId
      }))
    })
  });
}

export class ChatStreamError extends ApiError {}

function parseSseChunk(chunk: string, onToken: (token: string) => void) {
  const events = chunk.split('\n\n');
  for (const event of events) {
    if (!event.trim()) continue;
    const lines = event.split('\n');
    const eventLine = lines.find((line) => line.startsWith('event:'));
    const dataLine = lines.find((line) => line.startsWith('data:'));
    if (!dataLine) continue;

    const eventName = eventLine?.slice(6).trim();
    const data = dataLine.slice(5).trim();

    if (eventName === 'token') {
      const parsed = JSON.parse(data) as {token?: string};
      if (parsed.token) {
        onToken(parsed.token);
      }
    }
  }
}

export async function sendMessageStreaming(
  chatId: string,
  payload: SendMessagePayload,
  conversation: Array<{role: 'system' | 'user' | 'assistant'; content: string}>,
  onToken: (token: string) => void
): Promise<{assistant: string; avalaiRequestId: string | null}> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      chatId,
      messages: conversation,
      model: payload.deepThink ? 'gpt-oss-120b-1:0' : 'gpt-oss-120b-aws-bedrock'
    })
  });

  if (!response.ok || !response.body) {
    const payloadError = (await response.json().catch(() => undefined)) as
      | {error?: {message?: string}}
      | undefined;
    const message = payloadError?.error?.message ?? 'Streaming request failed.';
    throw new ChatStreamError(message, response.status, payloadError);
  }

  const requestId = response.headers.get('X-AvalAI-Request-Id');
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = '';
  let assistant = '';

  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, {stream: true});
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      parseSseChunk(`${chunk}\n\n`, (token) => {
        assistant += token;
        onToken(token);
      });
    }
  }

  if (buffer.trim()) {
    parseSseChunk(buffer, (token) => {
      assistant += token;
      onToken(token);
    });
  }

  return {assistant, avalaiRequestId: requestId};
}
