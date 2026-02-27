import {NextResponse} from 'next/server';
import {ApiError} from '@/lib/server/backend-types';

export function routeErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    const message =
      error.status === 429
        ? 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.'
        : error.message;
    return NextResponse.json({message}, {status: error.status});
  }

  return NextResponse.json({message: 'خطای داخلی سرور رخ داد.'}, {status: 500});
}
