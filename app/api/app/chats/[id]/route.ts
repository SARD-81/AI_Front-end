import {deleteChat, getChatDetail, renameChat} from '@/app/api/app/_lib/chat-store';

export const runtime = 'nodejs';

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const chat = await getChatDetail(id);

  if (!chat) {
    return Response.json({message: 'Chat not found'}, {status: 404});
  }

  return Response.json(
    {
      id: chat.id,
      title: chat.title,
      messages: chat.messages
    },
    {status: 200}
  );
}

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const payload = (await request.json().catch(() => ({}))) as {title?: unknown};

  if (typeof payload.title !== 'string' || !payload.title.trim()) {
    return Response.json({message: 'title is required'}, {status: 400});
  }

  const updated = await renameChat(id, payload.title);
  if (!updated) {
    return Response.json({message: 'Chat not found'}, {status: 404});
  }

  return Response.json(updated, {status: 200});
}

export async function DELETE(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const deleted = await deleteChat(id);

  if (!deleted) {
    return Response.json({message: 'Chat not found'}, {status: 404});
  }

  return Response.json({ok: true}, {status: 200});
}
