import {apiFetch} from '@/lib/api/client';
import {API_ENDPOINTS} from '@/lib/config/api-endpoints';
import type {ChatDetail, ChatMessage, ChatSummary} from '@/lib/api/chat';

type PaginatedMessages = {
  nextCursor: string | null;
  previousCursor: string | null;
  results: ChatMessage[];
};

type FeedbackReasonCategory = 'inaccurate' | 'irrelevant' | 'tone' | 'incomplete' | 'other';

type FeedbackBody = {
  is_liked: true | false | null;
  reason_category?: FeedbackReasonCategory;
  text_comment?: string;
};

function shapeFeedbackPayload(body: FeedbackBody):
  | {is_liked: true}
  | {is_liked: null}
  | {is_liked: false; reason_category: FeedbackReasonCategory; text_comment?: string} {
  if (body.is_liked === true) {
    return {is_liked: true};
  }

  if (body.is_liked === null) {
    return {is_liked: null};
  }

  if (!body.reason_category) {
    throw new Error('دلیل بازخورد نامعتبر است.');
  }

  return body.text_comment?.trim()
    ? {is_liked: false, reason_category: body.reason_category, text_comment: body.text_comment.trim()}
    : {is_liked: false, reason_category: body.reason_category};
}

export async function listConversations() {
  return apiFetch<ChatSummary[]>(API_ENDPOINTS.conversations.list);
}

export async function createConversation() {
  return apiFetch<ChatSummary>(API_ENDPOINTS.conversations.list, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function renameConversation(id: string, title: string) {
  return apiFetch<ChatSummary>(API_ENDPOINTS.conversations.byId(id), {
    method: 'PATCH',
    body: JSON.stringify({title})
  });
}

export async function deleteConversation(id: string) {
  return apiFetch<void>(API_ENDPOINTS.conversations.byId(id), {method: 'DELETE'});
}

export async function getConversation(id: string) {
  const messagePage = await listMessages(id);
  return {
    id,
    title: 'گفت‌وگو',
    messages: messagePage.results
  } as ChatDetail;
}

export async function listMessages(conversationId: string, cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return apiFetch<PaginatedMessages>(`${API_ENDPOINTS.conversations.messages(conversationId)}${query}`);
}

export async function sendMessage(conversationId: string, message: string) {
  return apiFetch<ChatMessage>(API_ENDPOINTS.chat.send, {
    method: 'POST',
    body: JSON.stringify({
      conversation_id: conversationId,
      message,
      client_message_id: crypto.randomUUID()
    })
  });
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
