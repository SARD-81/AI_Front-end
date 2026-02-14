import {createChat, listChats} from '../../_lib/app-chat-store';
import {toErrorResponse} from '../../_lib/route-utils';
import {validateTitle} from '../../_lib/validation';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const chats = await listChats();
    return Response.json(chats);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = validateTitle(await request.json().catch(() => ({})));
    const chat = await createChat(payload.title ?? 'گفت‌وگوی جدید');
    return Response.json(chat, {status: 201});
  } catch (error) {
    return toErrorResponse(error);
  }
}
