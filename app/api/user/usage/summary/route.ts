import {avalaiJson, AvalaiHttpError} from '@/src/server/avalai';
import {jsonError, toErrorResponse} from '@/src/server/route-utils';

export async function GET() {
  try {
    const {data} = await avalaiJson<unknown>('/transactions/summary', {method: 'GET', useUserBase: true});
    return Response.json(data);
  } catch (error) {
    if (error instanceof AvalaiHttpError && error.status === 404) {
      return jsonError('Usage summary endpoint not found. Please verify AvalAI User API path.', 404, {
        expectedPath: '/transactions/summary'
      });
    }
    return toErrorResponse(error);
  }
}
