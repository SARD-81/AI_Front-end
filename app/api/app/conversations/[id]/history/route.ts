import { NextResponse } from 'next/server';
import { backendFetch, BACKEND_HISTORY_TIMEOUT_MS } from '@/lib/server/backend-fetch';
import { callWithAutoRefresh } from '@/lib/server/with-refresh';
import { routeErrorResponse } from '@/lib/server/route-error';
import { readHistoryWindow } from '@/lib/server/chat-history';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const cursor = new URL(request.url).searchParams.get('cursor');
    const page = await readHistoryWindow(
      (query) =>
        callWithAutoRefresh((access) =>
          backendFetch(
            `/conversations/${encodeURIComponent(id)}/messages/${query ? `?${query}` : ''}`,
            {
              base: 'api',
              accessToken: access,
              method: 'GET',
              signal: request.signal,
              timeoutMs: BACKEND_HISTORY_TIMEOUT_MS
            }
          )
        ),
      cursor,
      process.env.CHAT_HISTORY_MODE === 'latest-first'
    );
    return NextResponse.json(page, {
      headers: { 'Cache-Control': 'private, no-store' }
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
