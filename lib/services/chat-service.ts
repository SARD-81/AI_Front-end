import {apiFetch} from '@/lib/api/client';
import {API_ENDPOINTS} from '@/lib/config/api-endpoints';
import type {ChatDetail, ChatMessage, ChatSummary} from '@/lib/api/chat';

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

type FeedbackReasonCategory = 'inaccurate' | 'irrelevant' | 'tone' | 'incomplete' | 'other';

type FeedbackBody =
  | {feedback: 'like' | 'dislike' | null}
  | {is_liked: true | false | null; reason_category?: FeedbackReasonCategory; text_comment?: string};

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

function shapeFeedbackPayload(body: FeedbackBody): {feedback: 'like' | 'dislike' | null} {
  if ('feedback' in body) {
    return {feedback: body.feedback};
  }

  if (body.is_liked === true) {
    return {feedback: 'like'};
  }

  if (body.is_liked === false) {
    return {feedback: 'dislike'};
  }

  return {feedback: null};
}

export async function listConversations() {
  const data = await apiFetch<BackendConversation[] | {results?: BackendConversation[]}>(API_ENDPOINTS.conversations.list);
  return normalizeConversationList(data);
}

export async function createConversation() {
  const data = await apiFetch<BackendConversation>(API_ENDPOINTS.conversations.list, {
    method: 'POST',
    body: JSON.stringify({})
  });
  return normalizeConversation(data);
}

export async function renameConversation(id: string, title: string) {
  const data = await apiFetch<BackendConversation>(API_ENDPOINTS.conversations.byId(id), {
    method: 'PATCH',
    body: JSON.stringify({title})
  });
  return normalizeConversation(data);
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

export async function sendMessage(conversationId: string, message: string) {
  const data = await apiFetch<BackendMessage>(API_ENDPOINTS.chat.send, {
    method: 'POST',
    body: JSON.stringify({
      conversation_id: conversationId,
      message,
      client_message_id: crypto.randomUUID()
    })
  });

  return normalizeMessage(data);
}

export async function putMessageFeedback(messageId: string, body: FeedbackBody, opts?: {signal?: AbortSignal}) {
  const payload = shapeFeedbackPayload(body);
  const response = await fetch(API_ENDPOINTS.messages.feedback(messageId), {
    method: 'PUT',
    credentials: 'same-origin',
    signal: opts?.signal,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({} as {message?: string}));
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : 'ارسال بازخورد ناموفق بود.';
    throw new Error(message);
  }

  return data;
}
