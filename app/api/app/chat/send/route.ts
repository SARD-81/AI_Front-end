import {randomUUID} from 'crypto';
import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';
import {callWithAutoRefresh} from '@/lib/server/with-refresh';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      conversation_id: string;
      message: string;
      client_message_id?: string;
    };

    const payload = {
      ...body,
      client_message_id: body.client_message_id || randomUUID()
    };

    const data = await callWithAutoRefresh((access) =>
      backendFetch('/chat/send/', {
        base: 'api',
        accessToken: access,
        method: 'POST',
        body: JSON.stringify(payload)
      })
    );

    return NextResponse.json(data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
