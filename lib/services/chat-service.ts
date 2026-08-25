import {ApiError, apiFetch, getApiBaseUrl} from '@/lib/api/client';
import {API_ENDPOINTS} from '@/lib/config/api-endpoints';
import {uuid} from '@/lib/utils/uid';
import type {AiResource, ChatDetail, ChatMessage, ChatSummary, MessageFeedbackPayload, SendMessagePayload} from '@/lib/api/chat';

type PaginatedMessages = {
  nextCursor: string | null;
  previousCursor: string | null;
  results: ChatMessage[];
};

type BackendConversation = {
  id: string;
  title?: string | null;
  last_message_at?: string | null;
  lastMessageAt?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
};

type BackendAiResource = {
  position?: number;
  dataset_id?: string | null;
  dataset_name?: string | null;
  document_id?: string | null;
  document_name?: string | null;
  segment_id?: string | null;
  score?: number;
  content?: string | null;
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
  ai_resources?: BackendAiResource[] | null;
  aiResources?: BackendAiResource[] | null;
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
    updatedAt: normalizeDate(
      item.last_message_at ??
        item.lastMessageAt ??
        item.updatedAt ??
        item.updated_at ??
        item.createdAt ??
        item.created_at
    )
  };
}

function normalizeConversationList(data: BackendConversation[] | {results?: BackendConversation[]}) {
  const list = Array.isArray(data) ? data : data.results ?? [];
  return list.map(normalizeConversation);
}

function normalizeAiResources(
  resources?: BackendAiResource[] | null
): AiResource[] {
  if (!Array.isArray(resources)) return [];

  return resources
    .map((resource) => ({
      position:
        typeof resource.position === 'number' ? resource.position : undefined,
      datasetId: resource.dataset_id?.trim() || undefined,
      datasetName: resource.dataset_name?.trim() || undefined,
      documentId: resource.document_id?.trim() || null,
      documentName: resource.document_name?.trim() || null,
      segmentId: resource.segment_id?.trim() || undefined,
      score: typeof resource.score === 'number' ? resource.score : undefined,
      content: resource.content?.trim() || undefined
    }))
    .filter(
      (resource) =>
        Boolean(resource.documentName) ||
        Boolean(resource.content) ||
        Boolean(resource.documentId)
    );
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
    is_liked: isLiked,
    aiResources: normalizeAiResources(
      message.ai_resources ?? message.aiResources
    )
  };
}

export async function listConversations() {
  const data = await apiFetch<BackendConversation[] | {results?: BackendConversation[]}>(API_ENDPOINTS.conversations.list);
  return normalizeConversationList(data);
}

export async function createConversation(title?: string) {
  const data = await apiFetch<BackendConversation>(API_ENDPOINTS.conversations.list, {
    method: 'POST',
    // A null title lets the backend generate one after the first answer.
    body: JSON.stringify({title: title?.trim() || null})
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
  ai_resources?: BackendAiResource[] | null;
};

type WsServerMessage =
  | {type: 'connected'; conversation_id?: string}
  | {type: 'ack'; message_id: string; duplicate_in_progress?: boolean}
  | {type: 'answer'; data: WsAnswerMessage; idempotent?: boolean}
  | {type: 'error'; code?: string; error: string};

// Client-side frame constraints from the backend contract. Violating them
// produces server error frames WITHOUT a `code`, so they are prevented here.
const WS_MESSAGE_MAX_LENGTH = 2500;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const configuredBase = process.env.NEXT_PUBLIC_WS_BASE_URL?.trim() || getApiBaseUrl();
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
  if (event.code === 4401) {
    return new ChatWebSocketError('Session authentication failed.', 'UNAUTHORIZED', event.code);
  }
  if (event.code === 4404) {
    return new ChatWebSocketError('Conversation was not found.', 'CONVERSATION_NOT_FOUND', event.code);
  }
  return new ChatWebSocketError(event.reason || 'WebSocket connection closed before an answer.', undefined, event.code);
}

export async function requestChatWsTicket() {
  return apiFetch<WsTicketResponse>(API_ENDPOINTS.chat.wsTicket, {method: 'POST'});
}

const WS_CONNECT_TIMEOUT_MS = 15_000;
// The AI upstream timeout is 120s; the client timeout must stay above it so a
// slow-but-valid answer is not cut off locally.
const WS_ANSWER_TIMEOUT_MS = 150_000;
const WS_MAX_ATTEMPTS = 3;
// `duplicate_in_progress` means another worker owns the reply lock and will
// push the answer to the previous socket, so the same client_message_id is
// replayed with bounded backoff (10s, 20s, 30s, 60s) until the stored answer
// arrives as an idempotent replay.
const WS_DUPLICATE_RETRY_DELAYS_MS = [10_000, 20_000, 30_000, 60_000];
const WS_DUPLICATE_MAX_ATTEMPTS = WS_DUPLICATE_RETRY_DELAYS_MS.length + 1;
// Backend allows 1 frame/second (6 per minute); keep retries above that.
const WS_RETRY_BASE_DELAY_MS = 1_500;

// Error codes the backend documents as safe to retry with the SAME
// client_message_id (server-side deduplication makes the replay idempotent).
const RETRYABLE_WS_ERROR_CODES = new Set([
  'TIMEOUT',
  'server_busy',
  'ai_starting',
  'ai_unavailable',
  'ai_timeout',
  'ai_error',
  'internal_error',
  'invalid_ai_response'
]);

// Codes that must never be retried automatically: `rate_limited` would burn
// the remaining budget (1/s, 6/60s, 30/h), `locked` closes the socket with
// 4403, and the client_message_id codes indicate a client-side bug.
const NON_RETRYABLE_WS_ERROR_CODES = new Set([
  'rate_limited',
  'locked',
  'missing_client_message_id',
  'invalid_client_message_id'
]);

function wsRetryDelay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new ChatWebSocketError('WebSocket send was aborted.'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, {once: true});
  });
}

function attemptSendMessageOverWebSocket(
  conversationId: string,
  wsTicket: string,
  payload: SendMessagePayload,
  state: {opened: boolean},
  opts?: {onAck?: () => void; signal?: AbortSignal}
) {
  return new Promise<ChatMessage>((resolve, reject) => {
    let settled = false;
    let answered = false;
    const socket = new WebSocket(resolveChatWebSocketUrl(conversationId, wsTicket));

    const cleanup = () => {
      clearTimeout(connectTimer);
      clearTimeout(answerTimer);
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

    const connectTimer = setTimeout(() => {
      fail(new ChatWebSocketError('WebSocket connection timed out.', 'TIMEOUT'));
    }, WS_CONNECT_TIMEOUT_MS);
    const answerTimer = setTimeout(() => {
      fail(new ChatWebSocketError('Timed out while waiting for the answer.', 'TIMEOUT'));
    }, WS_ANSWER_TIMEOUT_MS);

    socket.onopen = () => {
      // The ticket is consumed by the handshake, but the backend contract
      // requires waiting for the `connected` frame before sending.
      state.opened = true;
    };

    socket.onmessage = (event) => {
      let message: WsServerMessage;
      try {
        message = JSON.parse(String(event.data)) as WsServerMessage;
      } catch {
        fail(new ChatWebSocketError('Invalid WebSocket message.'));
        return;
      }

      if (message.type === 'connected') {
        clearTimeout(connectTimer);
        socket.send(
          JSON.stringify({
            message: payload.content,
            client_message_id: payload.clientMessageId,
            think_level: payload.thinkLevel
          })
        );
        return;
      }

      if (message.type === 'ack') {
        opts?.onAck?.();
        if (message.duplicate_in_progress) {
          // Another worker owns the reply lock for this client_message_id and
          // will push the answer to a different socket, so this attempt has to
          // be replayed with bounded backoff using the same id.
          fail(
            new ChatWebSocketError(
              'The answer is already being generated.',
              'duplicate_in_progress'
            )
          );
        }
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
        // `locked` arrives mid-session and is followed by a 4403 close.
        fail(
          new ChatWebSocketError(
            message.error,
            message.code,
            undefined,
            false,
            message.code === 'locked'
          )
        );
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

export async function sendMessageWithWebSocket(
  conversationId: string,
  payload: SendMessagePayload,
  opts?: {onAck?: () => void; signal?: AbortSignal}
) {
  // The backend does not type-check `message`: empty or over-long text is
  // rejected with an error frame that carries no `code`, so both are prevented
  // locally before a ticket is spent.
  if (!payload.content.trim()) {
    throw new ChatWebSocketError('Message text is empty.', 'message_empty');
  }
  if (payload.content.length > WS_MESSAGE_MAX_LENGTH) {
    throw new ChatWebSocketError('Message is too long.', 'message_too_long');
  }

  // client_message_id must be a UUID and must stay identical across retries
  // so the backend can deduplicate replays of the same logical message.
  const requestedClientMessageId = payload.clientMessageId;
  const stablePayload: SendMessagePayload = {
    ...payload,
    clientMessageId:
      requestedClientMessageId && UUID_PATTERN.test(requestedClientMessageId)
        ? requestedClientMessageId
        : uuid()
  };
  let attempt = 0;
  let duplicateAttempts = 0;

  for (;;) {
    attempt += 1;
    const state = {opened: false};
    try {
      const ticket = await requestChatWsTicket();
      return await attemptSendMessageOverWebSocket(conversationId, ticket.ticket, stablePayload, state, opts);
    } catch (error) {
      if (opts?.signal?.aborted) {
        throw error;
      }

      // The ticket store can be temporarily unavailable (503); the contract
      // asks for a backoff retry instead of failing the send.
      if (error instanceof ApiError && error.status === 503 && attempt < WS_MAX_ATTEMPTS) {
        await wsRetryDelay(WS_RETRY_BASE_DELAY_MS * attempt, opts?.signal);
        continue;
      }

      // Bounded replay of the same client_message_id while another worker is
      // still computing the answer (10s, 20s, 30s, 60s).
      if (error instanceof ChatWebSocketError && error.code === 'duplicate_in_progress') {
        if (duplicateAttempts + 1 >= WS_DUPLICATE_MAX_ATTEMPTS) {
          throw error;
        }
        const delay = WS_DUPLICATE_RETRY_DELAYS_MS[duplicateAttempts];
        duplicateAttempts += 1;
        await wsRetryDelay(delay, opts?.signal);
        continue;
      }

      const canRetry =
        attempt < WS_MAX_ATTEMPTS &&
        error instanceof ChatWebSocketError &&
        !(error.code !== undefined && NON_RETRYABLE_WS_ERROR_CODES.has(error.code)) &&
        (error.code === undefined
          ? !state.opened
          : RETRYABLE_WS_ERROR_CODES.has(error.code));
      if (!canRetry) {
        throw error;
      }
      await wsRetryDelay(WS_RETRY_BASE_DELAY_MS * attempt, opts?.signal);
    }
  }
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
