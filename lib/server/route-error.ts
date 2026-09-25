import {NextResponse} from 'next/server';
import {ApiError} from '@/lib/server/backend-types';

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  if (!value.every((item) => typeof item === 'string')) return undefined;
  return value;
}

function fieldErrors(payload: unknown): Record<string, string[]> | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }

  const fields: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (['code', 'detail', 'message', 'error', 'retry_after', 'status'].includes(key)) {
      continue;
    }
    const messages = stringList(value);
    if (messages) fields[key] = messages;
  }

  return Object.keys(fields).length > 0 ? fields : undefined;
}

export function routeErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    const message =
      error.status === 429
        ? 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.'
        : error.message;

    const body: {
      message: string;
      code?: string;
      retry_after?: number | null;
      details?: string[];
      fields?: Record<string, string[]>;
    } = {message};

    if (error.code) body.code = error.code;
    if (error.status === 429) {
      body.retry_after = error.retryAfter;
    } else if (typeof error.retryAfter === 'number') {
      body.retry_after = error.retryAfter;
    }

    const payload =
      error.payload && typeof error.payload === 'object' && !Array.isArray(error.payload)
        ? (error.payload as Record<string, unknown>)
        : undefined;
    const details = stringList(payload?.detail);
    if (details) body.details = details;
    const fields = fieldErrors(error.payload);
    if (fields) body.fields = fields;

    return NextResponse.json(body, {
      status: error.status,
      headers:
        typeof error.retryAfter === 'number'
          ? {'Retry-After': String(error.retryAfter)}
          : undefined
    });
  }

  return NextResponse.json({message: 'خطای داخلی سرور رخ داد.'}, {status: 500});
}
