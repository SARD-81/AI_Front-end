import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

type IncomingPayload = {
  is_liked?: unknown;
  comment?: unknown;
};

function badRequest(message: string): Response {
  return new Response(JSON.stringify({message}), {status: 400});
}

function normalizePayload(raw: unknown): {is_liked: boolean | null; comment?: string} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw badRequest('بدنه درخواست نامعتبر است.');
  }

  const payload = raw as IncomingPayload;

  if (typeof payload.is_liked !== 'boolean' && payload.is_liked !== null) {
    throw badRequest('مقدار بازخورد نامعتبر است.');
  }

  return {
    is_liked: payload.is_liked,
    ...(typeof payload.comment === 'string' && payload.comment.trim() ? {comment: payload.comment} : {})
  };
}

async function handleFeedback(request: Request, context: {params: Promise<{id: string}>}) {
  try {
    const {id} = await context.params;
    const payload = normalizePayload(await request.json());

    const data = await callWithAutoRefresh((access) =>
      backendFetch(`/messages/${id}/feedback/`, {
        base: 'api',
        accessToken: access,
        method: 'POST',
        body: JSON.stringify(payload)
      })
    );

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Response) {
      const message = await error.json().catch(() => ({message: 'درخواست نامعتبر است.'}));
      return NextResponse.json({message: typeof message?.message === 'string' ? message.message : 'درخواست نامعتبر است.'}, {status: error.status});
    }
    return routeErrorResponse(error);
  }
}

export async function POST(request: Request, context: {params: Promise<{id: string}>}) {
  return handleFeedback(request, context);
}

export async function PUT(request: Request, context: {params: Promise<{id: string}>}) {
  return handleFeedback(request, context);
}
