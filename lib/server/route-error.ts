import {NextResponse} from 'next/server';
import {ApiError} from '@/lib/server/backend-types';

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
    } = {message};

    if (error.code) body.code = error.code;
    if (error.status === 429) {
      body.retry_after = error.retryAfter;
    } else if (typeof error.retryAfter === 'number') {
      body.retry_after = error.retryAfter;
    }

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
