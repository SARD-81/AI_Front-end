/**
 * Self-check curls:
 * curl http://localhost:3000/api/app/chats
 * curl http://localhost:3000/api/app/chats/%3Cid%3E
 * curl http://localhost:3000/api/app/chats/<REAL_UUID_FROM_LIST>
 */
import {deleteChat, getChat, renameChat} from '../../../_lib/app-chat-store';
import {jsonError, toErrorResponse} from '../../../_lib/route-utils';
import {validateChatId} from '../../../_lib/validate-id';
import {validateTitle} from '../../../_lib/validation';

export const runtime = 'nodejs';

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

export async function GET(
  _request: Request,
  {params}: {params: {id: string}}
) {
  try {
    const validationError = validateChatId(params.id);
    if (validationError) {
      return jsonError(validationError, 400);
    }

    const result = await getChat(params.id);
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

export async function PATCH(
  request: Request,
  {params}: {params: {id: string}}
) {
  try {
    const validationError = validateChatId(params.id);
    if (validationError) {
      return jsonError(validationError, 400);
    }

    const payload = validateTitle(await request.json().catch(() => ({})));
    if (!payload.title) {
      return jsonError('title is required.', 400);
    }

    const updated = await renameChat(params.id, payload.title);
    if (!updated) {
      return jsonError('Chat not found.', 404);
    }

    return Response.json(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  {params}: {params: {id: string}}
) {
  try {
    const validationError = validateChatId(params.id);
    if (validationError) {
      return jsonError(validationError, 400);
    }

    const removed = await deleteChat(params.id);
    if (!removed) {
      return jsonError('Chat not found.', 404);
    }

    return new Response(null, {status: 204});
  } catch (error) {
    return toErrorResponse(error);
  }
}
