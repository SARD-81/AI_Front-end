import {createChat, listChats} from '@/app/api/app/_lib/chat-store';

export const runtime = 'nodejs';

export async function GET() {
  const chats = await listChats();
  return Response.json(chats, {status: 200});
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {title?: unknown};
  const title = typeof payload.title === 'string' ? payload.title : undefined;
  const chat = await createChat(title);
  return Response.json(chat, {status: 201});
}
