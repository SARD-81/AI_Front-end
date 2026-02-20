import {NextResponse} from 'next/server';
import {deleteChat, getChat, renameChat} from '../_store';

export async function GET(_request: Request, context: {params: Promise<{id: string}>}) {
  const {id} = await context.params;
  const chat = getChat(id);

  if (!chat) {
    return NextResponse.json({message: 'Chat not found.'}, {status: 404});
  }

  return NextResponse.json({id: chat.id, title: chat.title, messages: chat.messages});
}

export async function PATCH(request: Request, context: {params: Promise<{id: string}>}) {
  const {id} = await context.params;
  const payload = (await request.json().catch(() => ({}))) as {title?: string};

  if (typeof payload.title !== 'string') {
    return NextResponse.json({message: 'title is required.'}, {status: 400});
  }

  const renamed = renameChat(id, payload.title);

  if (!renamed) {
    return NextResponse.json({message: 'Chat not found.'}, {status: 404});
  }

  return NextResponse.json(renamed);
}

export async function DELETE(_request: Request, context: {params: Promise<{id: string}>}) {
  const {id} = await context.params;
  const deleted = deleteChat(id);

  if (!deleted) {
    return NextResponse.json({message: 'Chat not found.'}, {status: 404});
  }

  return new NextResponse(null, {status: 204});
}
