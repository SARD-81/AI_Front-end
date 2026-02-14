import {appendMessages, getChat} from '@/src/server/app-chat-store';
import {jsonError, toErrorResponse} from '@/src/server/route-utils';
import {validateMessagesList} from '@/src/server/validation';

export async function GET(_: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const result = await getChat(id);
    if (!result) {
      return jsonError('Chat not found.', 404);
    }
    return Response.json(result.messages);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const messages = validateMessagesList(await request.json());
    const created = await appendMessages(id, messages);
    if (!created) {
      return jsonError('Chat not found.', 404);
    }
    return Response.json(created, {status: 201});
  } catch (error) {
    return toErrorResponse(error);
  }
}
