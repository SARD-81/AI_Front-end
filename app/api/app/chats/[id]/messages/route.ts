import {appendMessages, getChatDetail} from '@/app/api/app/_lib/chat-store';

export const runtime = 'nodejs';

type MessageInput = {
  role: 'user' | 'assistant';
  content: string;
  providerRequestId?: string;
};

function isValidMessage(item: unknown): item is MessageInput {
  if (!item || typeof item !== 'object') return false;

  const message = item as Record<string, unknown>;
  const role = message.role;
  const content = message.content;

  if (role !== 'user' && role !== 'assistant') return false;
  if (typeof content !== 'string' || !content.trim()) return false;
  if (message.providerRequestId !== undefined && typeof message.providerRequestId !== 'string') return false;

  return true;
}

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const payload = (await request.json().catch(() => ({}))) as {messages?: unknown};

  if (!Array.isArray(payload.messages) || payload.messages.length === 0 || !payload.messages.every(isValidMessage)) {
    return Response.json({message: 'messages payload is invalid'}, {status: 400});
  }

  const saved = await appendMessages(id, payload.messages);
  if (!saved) {
    return Response.json({message: 'Chat not found'}, {status: 404});
  }

  const chat = await getChatDetail(id);

  return Response.json(
    {
      id,
      appended: saved,
      chat: chat
        ? {
            id: chat.id,
            title: chat.title,
            messages: chat.messages
          }
        : null
    },
    {status: 200}
  );
}
