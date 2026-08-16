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

  // An omitted `is_liked` (including an empty `{}` body) means a withdrawn vote.
  if (
    payload.is_liked !== undefined &&
    typeof payload.is_liked !== 'boolean' &&
    payload.is_liked !== null
  ) {
    throw badRequest('مقدار بازخورد نامعتبر است.');
  }

  const isLiked: boolean | null =
    payload.is_liked === undefined ? null : payload.is_liked;

  // `text_comment` is optional per the backend contract: an omitted or null
  // value withdraws the comment, and an empty string is stored as null.
  if (
    payload.text_comment !== undefined &&
    payload.text_comment !== null &&
    typeof payload.text_comment !== 'string'
  ) {
    throw badRequest('متن بازخورد نامعتبر است.');
  }

  const textComment = typeof payload.text_comment === 'string' ? payload.text_comment : null;

  if (textComment !== null && textComment.length > 1000) {
    throw badRequest('متن بازخورد نباید بیشتر از ۱۰۰۰ کاراکتر باشد.');
  }

  const reasonCategory =
    payload.reason_category === undefined ? null : payload.reason_category;

  if (reasonCategory !== null && !allowedReasonCategories.has(reasonCategory as FeedbackReasonCategory)) {
    throw badRequest('دلیل بازخورد نامعتبر است.');
  }

  if (isLiked === false && reasonCategory === null) {
    throw badRequest('انتخاب دلیل برای بازخورد منفی الزامی است.');
  }

  // PUT carries the full desired state: `is_liked: null` clears both fields.
  return {
    is_liked: isLiked,
    reason_category: isLiked === true || isLiked === null ? null : (reasonCategory as FeedbackReasonCategory),
    text_comment: isLiked === null ? null : textComment
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
