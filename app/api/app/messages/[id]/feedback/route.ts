import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

type IncomingPayload = {
  feedback?: string | null;
  is_liked?: boolean | null;
};

function badRequest(message: string): Response {
  return new Response(JSON.stringify({message}), {status: 400});
}

function normalizePayload(raw: unknown): {feedback: string | null} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw badRequest('بدنه درخواست نامعتبر است.');
  }

  const payload = raw as IncomingPayload;

  if (payload.feedback === 'like' || payload.feedback === 'dislike' || payload.feedback === null) {
    return {feedback: payload.feedback};
  }

  if (payload.is_liked === true) return {feedback: 'like'};
  if (payload.is_liked === false) return {feedback: 'dislike'};
  if (payload.is_liked === null) return {feedback: null};

  throw badRequest('مقدار بازخورد نامعتبر است.');
}

export async function PUT(request: Request, context: {params: Promise<{id: string}>}) {
  try {
    const {id} = await context.params;
    const payload = normalizePayload(await request.json());

    const data = await callWithAutoRefresh((access) =>
      backendFetch(`/messages/${id}/feedback/`, {
        base: 'api',
        accessToken: access,
        method: 'PUT',
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
