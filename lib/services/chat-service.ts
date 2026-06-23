import {ApiError, apiFetch, getApiBaseUrl} from '@/lib/api/client';
import {API_ENDPOINTS} from '@/lib/config/api-endpoints';
import type {ChatDetail, ChatMessage, ChatSummary, MessageFeedbackPayload, SendMessagePayload} from '@/lib/api/chat';

type PaginatedMessages = {
  nextCursor: string | null;
  previousCursor: string | null;
  results: ChatMessage[];
};

type BackendConversation = {
  id: string;
  title?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
};

type BackendMessage = {
  id: string;
  role: 'user' | 'assistant';
  content?: string | null;
  message?: string | null;
  text?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  is_liked?: boolean | null;
  feedback?: 'like' | 'dislike' | null;
};

type FeedbackBody = MessageFeedbackPayload;


function getStringValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(getStringValue).find(Boolean) ?? '';
  return '';
}

function getTitleErrorMessage(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) return '';

  const record = payload as Record<string, unknown>;
  const directTitle = getStringValue(record.title);
  if (directTitle) return directTitle;

  const error = record.error;
  if (typeof error === 'object' && error !== null) {
    const nestedTitle = getStringValue((error as Record<string, unknown>).title);
    if (nestedTitle) return nestedTitle;
  }

  return '';
}

function normalizeDate(value?: string | null) {
  return value ?? new Date().toISOString();
}

function normalizeConversation(item: BackendConversation): ChatSummary {
  return {
    id: item.id,
    title: item.title?.trim() || 'گفت‌وگو',
    updatedAt: normalizeDate(item.updatedAt ?? item.updated_at ?? item.createdAt ?? item.created_at)
  };
}

function normalizeConversationList(data: BackendConversation[] | {results?: BackendConversation[]}) {
  const list = Array.isArray(data) ? data : data.results ?? [];
  return list.map(normalizeConversation);
}

function normalizeMessage(message: BackendMessage): ChatMessage {
  const isLiked =
    message.is_liked !== undefined
      ? message.is_liked
      : message.feedback === 'like'
        ? true
        : message.feedback === 'dislike'
          ? false
          : null;

  return {
    id: message.id,
    role: message.role,
    content: message.content ?? message.message ?? message.text ?? '',
    createdAt: normalizeDate(message.createdAt ?? message.created_at),
    is_liked: isLiked
  };
}

export async function listConversations() {
  const data = await apiFetch<BackendConversation[] | {results?: BackendConversation[]}>(API_ENDPOINTS.conversations.list);
  return normalizeConversationList(data);
}

export async function createConversation(title = 'گفت‌وگو') {
  const data = await apiFetch<BackendConversation>(API_ENDPOINTS.conversations.list, {
    method: 'POST',
    body: JSON.stringify({title})
  });
  return normalizeConversation(data);
}

export async function renameConversation(id: string, title: string) {
  const trimmedTitle = title.trim();

  try {
    const data = await apiFetch<BackendConversation>(API_ENDPOINTS.conversations.byId(id), {
      method: 'PATCH',
      body: JSON.stringify({title: trimmedTitle})
    });
    return normalizeConversation(data);
  } catch (error) {
    if (error instanceof ApiError) {
      const titleMessage = getTitleErrorMessage(error.payload);
      if (titleMessage) {
        throw new ApiError(titleMessage, error.status, error.payload);
      }
    }

    throw error;
  }
}

export async function deleteConversation(id: string) {
  return apiFetch<void>(API_ENDPOINTS.conversations.byId(id), {method: 'DELETE'});
}

export async function getConversation(id: string) {
  const [detail, messagePage] = await Promise.all([
    apiFetch<BackendConversation>(API_ENDPOINTS.conversations.byId(id)),
    listMessages(id)
  ]);

  const summary = normalizeConversation({...detail, id: detail.id ?? id});
  return {
    id: summary.id,
    title: summary.title,
    messages: messagePage.results
  } as ChatDetail;
}

export async function listMessages(conversationId: string, cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const data = await apiFetch<{
    nextCursor?: string | null;
    previousCursor?: string | null;
    results?: BackendMessage[];
  }>(`${API_ENDPOINTS.conversations.messages(conversationId)}${query}`);

  return {
    nextCursor: data.nextCursor ?? null,
    previousCursor: data.previousCursor ?? null,
    results: (data.results ?? []).map(normalizeMessage)
  } satisfies PaginatedMessages;
}

export async function sendMessage(conversationId: string, payload: SendMessagePayload) {
  const data = await apiFetch<BackendMessage>(API_ENDPOINTS.chat.send, {
    method: 'POST',
    body: JSON.stringify({
      conversation_id: conversationId,
      message: payload.content,
      client_message_id: payload.clientMessageId,
      think_level: payload.thinkLevel
    })
  });

  return normalizeMessage(data);
}

type WsTicketResponse = {
  ticket: string;
  expires_in: number;
};

type WsAnswerMessage = {
  id: string;
  client_message_id: string | null;
  role: 'assistant';
  content: string;
  created_at: string;
};

type WsServerMessage =
  | {type: 'connected'; conversation_id: string}
  | {type: 'ack'; message_id: string}
  | {type: 'answer'; data: WsAnswerMessage; idempotent: boolean}
  | {type: 'error'; code: string; error: string};

export class ChatWebSocketError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly closeCode?: number,
    public readonly shouldRedirectToProfile = false,
    public readonly isLocked = false
  ) {
    super(message);
  }
}

function resolveChatWebSocketUrl(conversationId: string, ticket: string) {
  const configuredBase = getApiBaseUrl();
  const base = configuredBase || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = new URL(base || 'http://localhost');
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `/ws/chat/${encodeURIComponent(conversationId)}/`;
  url.search = '';
  url.searchParams.set('ticket', ticket);
  return url.toString();
}

function mapCloseError(event: CloseEvent) {
  if (event.code === 4405) {
    return new ChatWebSocketError('Profile is incomplete.', 'PROFILE_INCOMPLETE', event.code, true);
  }
  if (event.code === 4403) {
    return new ChatWebSocketError('Account is locked.', 'LOCKED', event.code, false, true);
  }
  return new ChatWebSocketError(event.reason || 'WebSocket connection closed before an answer.', undefined, event.code);
}

export async function requestChatWsTicket() {
  return apiFetch<WsTicketResponse>(API_ENDPOINTS.chat.wsTicket, {method: 'POST'});
}

export async function sendMessageWithWebSocket(
  conversationId: string,
  payload: SendMessagePayload,
  opts?: {onAck?: () => void; signal?: AbortSignal}
) {
  const ticket = await requestChatWsTicket();

  return new Promise<ChatMessage>((resolve, reject) => {
    let settled = false;
    let answered = false;
    const socket = new WebSocket(resolveChatWebSocketUrl(conversationId, ticket.ticket));

    const cleanup = () => {
      opts?.signal?.removeEventListener('abort', handleAbort);
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      reject(error);
    };

    const handleAbort = () => fail(new ChatWebSocketError('WebSocket send was aborted.'));

    opts?.signal?.addEventListener('abort', handleAbort, {once: true});

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          message: payload.content,
          client_message_id: payload.clientMessageId,
          think_level: payload.thinkLevel
        })
      );
    };

    socket.onmessage = (event) => {
      let message: WsServerMessage;
      try {
        message = JSON.parse(String(event.data)) as WsServerMessage;
      } catch {
        fail(new ChatWebSocketError('Invalid WebSocket message.'));
        return;
      }

      if (message.type === 'ack') {
        opts?.onAck?.();
        return;
      }

      if (message.type === 'answer') {
        answered = true;
        if (settled) return;
        settled = true;
        cleanup();
        socket.close();
        resolve(normalizeMessage(message.data));
        return;
      }

      if (message.type === 'error') {
        fail(new ChatWebSocketError(message.error, message.code));
      }
    };

    socket.onerror = () => fail(new ChatWebSocketError('WebSocket connection failed.'));
    socket.onclose = (event) => {
      if (!settled && !answered) {
        fail(mapCloseError(event));
      }
    };
  });
}

export async function putMessageFeedback(messageId: string, body: FeedbackBody, opts?: {signal?: AbortSignal}) {
  return apiFetch(API_ENDPOINTS.messages.feedback(messageId), {
    method: 'PUT',
    signal: opts?.signal,
    body: JSON.stringify({
      is_liked: body.is_liked,
      reason_category: body.reason_category,
      text_comment: body.text_comment
    })
  });
}
