import {appendMessages, getChat} from '../../../../_lib/app-chat-store';
import {jsonError, toErrorResponse} from '../../../../_lib/route-utils';
import {validateChatId} from '../../../../_lib/validate-id';
import {validateMessages} from '../../../../_lib/validation';

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

    return Response.json(result.messages.map(toClientMessage));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  {params}: {params: {id: string}}
) {
  try {
    const validationError = validateChatId(params.id);
    if (validationError) {
      return jsonError(validationError, 400);
    }

    const payload = validateMessages(await request.json().catch(() => ({})));
    const created = await appendMessages(params.id, payload);

    if (!created) {
      return jsonError('Chat not found.', 404);
    }

    return Response.json(created.map(toClientMessage), {status: 201});
  } catch (error) {
    return toErrorResponse(error);
  }
}
