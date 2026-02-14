import {avalaiJson} from '@/src/server/avalai';
import {toErrorResponse} from '@/src/server/route-utils';
import {validateLookupRequest} from '@/src/server/validation';

export async function POST(request: Request) {
  try {
    const requestId = validateLookupRequest(await request.json());

    const {data} = await avalaiJson<unknown>('/transactions/lookup', {
      method: 'POST',
      useUserBase: true,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({requestId, request_id: requestId})
    });

    return Response.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
