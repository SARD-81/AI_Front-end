import {createChat, listChats} from '@/src/server/app-chat-store';
import {toErrorResponse} from '@/src/server/route-utils';
import {validateTitle} from '@/src/server/validation';

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
    const body = validateTitle(await request.json().catch(() => ({})));
    const chat = await createChat(body.title ?? 'گفت‌وگوی جدید');
    return Response.json(chat, {status: 201});
  } catch (error) {
    return toErrorResponse(error);
  }
}
