import {NextResponse} from 'next/server';
import {backendFetch} from '@/lib/server/backend-fetch';
import {ApiError} from '@/lib/server/backend-types';
import {routeErrorResponse} from '@/lib/server/route-error';

type ReadinessResponse = {
  status: 'ready' | 'not_ready';
  checks: {
    database: string;
    cache: string;
  };
};

function isReadinessPayload(payload: unknown): payload is ReadinessResponse {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return record.status === 'ready' || record.status === 'not_ready';
}

// Readiness probe. Unauthenticated by contract. A failed dependency check is a
// documented 503 with the same body shape as the 200, so that payload is
// forwarded verbatim instead of being turned into a generic error.
export async function GET() {
  try {
    const data = await backendFetch<ReadinessResponse>('/ready/', {base: 'api', method: 'GET'});

    return NextResponse.json(data, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof ApiError && error.status === 503 && isReadinessPayload(error.payload)) {
      return NextResponse.json(error.payload, {
        status: 503,
        headers: {'Cache-Control': 'no-store'}
      });
    }
    return routeErrorResponse(error);
  }
}
