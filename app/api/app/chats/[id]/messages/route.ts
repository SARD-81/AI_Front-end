import {appendMessages, getChat} from '../../../../_lib/app-chat-store';
import {jsonError, toErrorResponse} from '../../../../_lib/route-utils';
import {validateMessages} from '../../../../_lib/validation';

export const runtime = 'nodejs';

function getChatIdFromUrl(request: Request): string {
  const {pathname} = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  return segments[segments.length - 2] ?? '';
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

    return Response.json(result.messages.map(toClientMessage));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const chatId = getChatIdFromUrl(request);
    const payload = validateMessages(await request.json().catch(() => ({})));
    const created = await appendMessages(chatId, payload);

    if (!created) {
      return jsonError('Chat not found.', 404);
    }

    return Response.json(created.map(toClientMessage), {status: 201});
  } catch (error) {
    return toErrorResponse(error);
  }
}
