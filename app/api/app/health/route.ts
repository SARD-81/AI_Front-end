import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {routeErrorResponse} from '@/lib/server/route-error';

type LivenessResponse = {
  status: 'healthy';
};

// Liveness probe. Unauthenticated by contract and intentionally independent of
// PostgreSQL/Redis, so no access token is attached and no refresh is attempted.
export async function GET() {
  try {
    const data = await backendFetch<LivenessResponse>('/health/', {base: 'api', method: 'GET'});

    return NextResponse.json(data, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    return routeErrorResponse(error);
  }
}
