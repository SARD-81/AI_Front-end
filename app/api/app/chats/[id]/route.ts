import {deleteChat, getChat, renameChat} from '../../../_lib/app-chat-store';
import {jsonError, toErrorResponse} from '../../../_lib/route-utils';
import {validateTitle} from '../../../_lib/validation';

export const runtime = 'nodejs';

function getChatIdFromUrl(request: Request): string {
  const {pathname} = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? '';
}

function toClientMessage(message: {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt: string;
  avalaiRequestId?: string;
}) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    avalaiRequestId: message.avalaiRequestId
  };
}

export async function GET(request: Request) {
  try {
    const chatId = getChatIdFromUrl(request);
    const result = await getChat(chatId);
    if (!result) {
      return jsonError('Chat not found.', 404);
    }

    return Response.json({
      id: result.chat.id,
      title: result.chat.title,
      messages: result.messages.map(toClientMessage)
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const chatId = getChatIdFromUrl(request);
    const payload = validateTitle(await request.json().catch(() => ({})));
    if (!payload.title) {
      return jsonError('title is required.', 400);
    }

    const updated = await renameChat(chatId, payload.title);
    if (!updated) {
      return jsonError('Chat not found.', 404);
    }

    return Response.json(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const chatId = getChatIdFromUrl(request);
    const removed = await deleteChat(chatId);
    if (!removed) {
      return jsonError('Chat not found.', 404);
    }

    return new Response(null, {status: 204});
  } catch (error) {
    return toErrorResponse(error);
  }
}
