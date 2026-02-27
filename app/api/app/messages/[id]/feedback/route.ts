import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

export async function PUT(request: Request, context: {params: Promise<{id: string}>}) {
  try {
    const {id} = await context.params;
    const body = await request.json();

    const data = await callWithAutoRefresh((access) =>
      backendFetch(`/messages/${id}/feedback/`, {
        base: 'api',
        accessToken: access,
        method: 'PUT',
        body: JSON.stringify(body)
      })
    );

    return NextResponse.json(data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
