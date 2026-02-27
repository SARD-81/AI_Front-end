import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

const ALLOWED_REASON_CATEGORIES = new Set(['inaccurate', 'irrelevant', 'tone', 'incomplete', 'other'] as const);

type AllowedReasonCategory = 'inaccurate' | 'irrelevant' | 'tone' | 'incomplete' | 'other';

type FeedbackPayload =
  | {is_liked: true}
  | {is_liked: null}
  | {is_liked: false; reason_category: AllowedReasonCategory; text_comment?: string};

function validateFeedbackPayload(raw: unknown): FeedbackPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Response(JSON.stringify({message: 'بدنه درخواست نامعتبر است.'}), {status: 400});
  }

  const payload = raw as Record<string, unknown>;
  const keys = Object.keys(payload);

  if (!('is_liked' in payload) || ![true, false, null].includes(payload.is_liked as never)) {
    throw new Response(JSON.stringify({message: 'مقدار is_liked نامعتبر است.'}), {status: 400});
  }

  if (payload.is_liked === true) {
    if (keys.some((key) => key !== 'is_liked')) {
      throw new Response(JSON.stringify({message: 'برای لایک فقط فیلد is_liked مجاز است.'}), {status: 400});
    }
    return {is_liked: true};
  }

  if (payload.is_liked === null) {
    if (keys.some((key) => key !== 'is_liked')) {
      throw new Response(JSON.stringify({message: 'برای حذف بازخورد فقط فیلد is_liked مجاز است.'}), {status: 400});
    }
    return {is_liked: null};
  }

  if (!('reason_category' in payload) || typeof payload.reason_category !== 'string' || !ALLOWED_REASON_CATEGORIES.has(payload.reason_category as AllowedReasonCategory)) {
    throw new Response(JSON.stringify({message: 'reason_category نامعتبر است.'}), {status: 400});
  }

  if (payload.text_comment !== undefined && typeof payload.text_comment !== 'string') {
    throw new Response(JSON.stringify({message: 'text_comment باید رشته باشد.'}), {status: 400});
  }

  if (keys.some((key) => !['is_liked', 'reason_category', 'text_comment'].includes(key))) {
    throw new Response(JSON.stringify({message: 'فیلد اضافی مجاز نیست.'}), {status: 400});
  }

  const normalized: FeedbackPayload = {
    is_liked: false,
    reason_category: payload.reason_category as AllowedReasonCategory
  };

  if (typeof payload.text_comment === 'string' && payload.text_comment.trim()) {
    normalized.text_comment = payload.text_comment;
  }

  return normalized;
}

export async function PUT(request: Request, context: {params: Promise<{id: string}>}) {
  try {
    const {id} = await context.params;
    const body = await request.json();
    const payload = validateFeedbackPayload(body);

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
