import {NextResponse} from 'next/server';
import {appendMessages, getChat} from '../../_store';
import type {MessageRole} from '@/lib/api/chat';

type InputMessage = {
  role: MessageRole;
  content: string;
};

type RequestPayload = {
  messages?: InputMessage[];
  content?: string;
};

function normalizeMessages(payload: RequestPayload): InputMessage[] {
  if (Array.isArray(payload.messages)) {
    return payload.messages
      .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
      .map((item) => ({role: item.role, content: item.content?.toString() ?? ''}))
      .filter((item) => item.content.trim().length > 0);
  }

  if (typeof payload.content === 'string' && payload.content.trim()) {
    return [{role: 'user', content: payload.content.trim()}];
  }

  return [];
}

export async function POST(request: Request, context: {params: Promise<{id: string}>}) {
  const {id} = await context.params;

  if (!getChat(id)) {
    return NextResponse.json({message: 'Chat not found.'}, {status: 404});
  }

  const payload = (await request.json().catch(() => ({}))) as RequestPayload;
  const messages = normalizeMessages(payload);

  if (!messages.length) {
    return NextResponse.json({message: 'No messages provided.'}, {status: 400});
  }

  const result = appendMessages(id, messages);

  if (!result) {
    return NextResponse.json({message: 'Chat not found.'}, {status: 404});
  }

  return NextResponse.json(result, {status: 201});
}
