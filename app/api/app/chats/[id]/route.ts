import {deleteChat, getChat, renameChat} from '@/src/server/app-chat-store';
import {jsonError, toErrorResponse} from '@/src/server/route-utils';
import {validateTitle} from '@/src/server/validation';

export async function GET(_: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const result = await getChat(id);
    if (!result) {
      return jsonError('Chat not found.', 404);
    }
    return Response.json({
      id: result.chat.id,
      title: result.chat.title,
      messages: result.messages
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const body = validateTitle(await request.json());
    if (!body.title) {
      return jsonError('title is required.', 400);
    }
    const updated = await renameChat(id, body.title);
    if (!updated) {
      return jsonError('Chat not found.', 404);
    }
    return Response.json(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const removed = await deleteChat(id);
    if (!removed) {
      return jsonError('Chat not found.', 404);
    }
    return new Response(null, {status: 204});
  } catch (error) {
    return toErrorResponse(error);
  }
}
