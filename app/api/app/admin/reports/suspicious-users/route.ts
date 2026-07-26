import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

// Admin-only list of users who sent 30 or more messages today. The list may be
// empty; that is a normal 200 response, not an error.
export async function GET() {
  try {
    const data = await callWithAutoRefresh((access) =>
      backendFetch('/admin/reports/suspicious-users/', {
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
