import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Admin-only aggregate feedback report. `from_date`/`to_date` are optional and
// default server-side to the last 7 days; they are validated here so a typo
// never reaches the backend as a 400.
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const query = new URLSearchParams();

    for (const key of ['from_date', 'to_date'] as const) {
      const value = params.get(key)?.trim();
      if (!value) continue;
      if (!DATE_PATTERN.test(value)) {
        return NextResponse.json(
          {message: `قالبِ ${key} نامعتبر است؛ از YYYY-MM-DD استفاده کنید.`},
          {status: 400}
        );
      }
      query.set(key, value);
    }

    const suffix = query.size ? `?${query.toString()}` : '';

    const data = await callWithAutoRefresh((access) =>
      backendFetch(`/admin/reports/feedback/${suffix}`, {
        base: 'api',
        accessToken: access,
        method: 'GET'
      })
    );

    return NextResponse.json(data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
