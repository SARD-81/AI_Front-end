import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

type WsTicketResponse = {
  ticket: string;
  expires_in: number;
};

export async function POST() {
  try {
    const data = await callWithAutoRefresh((access) =>
      backendFetch<WsTicketResponse>('/chat/ws-ticket/', {
        base: 'api',
        accessToken: access,
        method: 'POST'
      })
    );

    return NextResponse.json(data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
