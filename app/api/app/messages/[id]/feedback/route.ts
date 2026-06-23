import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';
import type {FeedbackReasonCategory, MessageFeedbackPayload} from '@/lib/api/chat';

const allowedReasonCategories = new Set<FeedbackReasonCategory>(['inaccurate', 'irrelevant', 'tone', 'incomplete', 'other']);

type IncomingPayload = {
  is_liked?: unknown;
  reason_category?: unknown;
  text_comment?: unknown;
};

function badRequest(message: string): Response {
  return new Response(JSON.stringify({message}), {status: 400});
}

function normalizePayload(raw: unknown): MessageFeedbackPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw badRequest('بدنه درخواست نامعتبر است.');
  }

  const payload = raw as IncomingPayload;

  if (typeof payload.is_liked !== 'boolean' && payload.is_liked !== null) {
    throw badRequest('مقدار بازخورد نامعتبر است.');
  }

  if (typeof payload.text_comment !== 'string') {
    throw badRequest('متن بازخورد نامعتبر است.');
  }

  if (payload.text_comment.length > 1000) {
    throw badRequest('متن بازخورد نباید بیشتر از ۱۰۰۰ کاراکتر باشد.');
  }

  if (payload.reason_category !== null && !allowedReasonCategories.has(payload.reason_category as FeedbackReasonCategory)) {
    throw badRequest('دلیل بازخورد نامعتبر است.');
  }

  if (payload.is_liked === false && payload.reason_category === null) {
    throw badRequest('انتخاب دلیل برای بازخورد منفی الزامی است.');
  }

  return {
    is_liked: payload.is_liked,
    reason_category: payload.is_liked === true || payload.is_liked === null ? null : (payload.reason_category as FeedbackReasonCategory),
    text_comment: payload.is_liked === null ? '' : payload.text_comment
  };
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
