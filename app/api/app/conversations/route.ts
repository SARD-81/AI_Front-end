import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

export async function GET() {
  try {
    const data = await callWithAutoRefresh((access) =>
      backendFetch('/conversations/', {base: 'api', accessToken: access, method: 'GET'})
    );
    return NextResponse.json(data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({} as {title?: unknown}));
    const title = typeof body?.title === 'string' && body.title.trim() ? body.title : 'گفت‌وگو';

    const data = await callWithAutoRefresh((access) =>
      backendFetch('/conversations/', {
        base: 'api',
        accessToken: access,
        method: 'POST',
        body: JSON.stringify({title})
      })
    );
    return NextResponse.json(data, {status: 201});
  } catch (error) {
    return routeErrorResponse(error);
  }
}
