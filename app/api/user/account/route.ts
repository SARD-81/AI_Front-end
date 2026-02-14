import {avalaiJson, AvalaiHttpError} from '@/src/server/avalai';
import {jsonError, toErrorResponse} from '@/src/server/route-utils';

export async function GET() {
  try {
    const {data} = await avalaiJson<unknown>('/account', {method: 'GET', useUserBase: true});
    return Response.json(data);
  } catch (error) {
    if (error instanceof AvalaiHttpError && error.status === 404) {
      return jsonError('Account endpoint not found. // TODO(DOCS): confirm endpoint path.', 404);
    }
    return toErrorResponse(error);
  }
}
