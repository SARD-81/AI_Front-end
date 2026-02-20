import {NextResponse} from 'next/server';
import {createChat, listChatSummaries} from './_store';

export async function GET() {
  return NextResponse.json(listChatSummaries());
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {title?: string};
  const chat = createChat(payload.title);

  return NextResponse.json(chat, {status: 201});
}
