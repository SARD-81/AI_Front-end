import {NextResponse} from 'next/server';
import {ApiError} from '@/lib/server/backend-types';

export function routeErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    const message =
      error.status === 429
        ? 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.'
        : error.message;
    // The backend contract exposes a stable `code` plus `retry_after` (seconds)
    // on rate-limit responses; both are forwarded so the client can show the
    // remaining wait and branch on the code instead of the message text.
    const body: {message: string; code?: string; retry_after?: number} = {message};
    if (error.code) body.code = error.code;
    if (typeof error.retryAfter === 'number') body.retry_after = error.retryAfter;

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
