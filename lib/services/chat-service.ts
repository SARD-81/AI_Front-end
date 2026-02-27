import {apiFetch} from '@/lib/api/client';
import {API_ENDPOINTS} from '@/lib/config/api-endpoints';
import type {ChatDetail, ChatMessage, ChatSummary} from '@/lib/api/chat';

type PaginatedMessages = {
  nextCursor: string | null;
  previousCursor: string | null;
  results: ChatMessage[];
};

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

export async function sendFeedback(
  messageId: string,
  payload: {is_liked: boolean; reason_category?: string; text_comment?: string}
) {
  return apiFetch(API_ENDPOINTS.messages.feedback(messageId), {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}
