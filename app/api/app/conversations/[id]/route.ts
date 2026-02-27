import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

export async function PATCH(request: Request, context: {params: Promise<{id: string}>}) {
  try {
    const {id} = await context.params;
    const body = await request.json();

    const data = await callWithAutoRefresh((access) =>
      backendFetch(`/conversations/${id}/`, {
        base: 'api',
        accessToken: access,
        method: 'PATCH',
        body: JSON.stringify({title: body.title})
      })
    );

    return NextResponse.json(data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: {params: Promise<{id: string}>}) {
  try {
    const {id} = await context.params;

    await callWithAutoRefresh((access) =>
      backendFetch(`/conversations/${id}/`, {
        base: 'api',
        accessToken: access,
        method: 'DELETE'
      })
    );

    return new NextResponse(null, {status: 204});
  } catch (error) {
    return routeErrorResponse(error);
  }
}
