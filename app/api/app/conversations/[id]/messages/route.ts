import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

function getCursor(raw?: string | null) {
  if (!raw) return null;
  const value = new URL(raw).searchParams.get('cursor');
  return value ?? null;
}

export async function GET(request: Request, context: {params: Promise<{id: string}>}) {
  try {
    const {id} = await context.params;
    const cursor = new URL(request.url).searchParams.get('cursor');
    const path = cursor ? `/conversations/${id}/messages/?cursor=${encodeURIComponent(cursor)}` : `/conversations/${id}/messages/`;

    const data = await callWithAutoRefresh((access) =>
      backendFetch<{next?: string | null; previous?: string | null; results?: unknown[]}>(path, {base: 'api', accessToken: access, method: 'GET'})
    );

    return NextResponse.json({
      nextCursor: getCursor(data.next),
      previousCursor: getCursor(data.previous),
      results: data.results ?? []
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
