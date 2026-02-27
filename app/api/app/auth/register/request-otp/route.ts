import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await backendFetch('/register/request-otp/', {
      base: 'auth',
      method: 'POST',
      body: JSON.stringify(body)
    });

    return NextResponse.json(data);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
