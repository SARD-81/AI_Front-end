import {OpenRouterApiError, openrouterChatStream, validateChatPayload} from '@/app/api/_lib/openrouter';

export const runtime = 'nodejs';

const RESPONSE_HEADERS = {
  'X-LLM-Provider': 'openrouter'
};

const IS_DEV = process.env.NODE_ENV !== 'production';

type RouteError = {
  error: {
    message: string;
    details?: unknown;
  };
};

// Self-check examples:
// curl -N -X POST http://localhost:3000/api/chat/stream \
//   -H "Content-Type: application/json" \
//   -d '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"سلام، یک جواب کوتاه بده"}]}'
export async function POST(request: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json({error: {message: 'Missing OPENROUTER_API_KEY'}}, {status: 500, headers: RESPONSE_HEADERS});
  }

  try {
    const payload = validateChatPayload(await request.json());
    const {response, modelUsed, requestId} = await openrouterChatStream(payload);

    if (IS_DEV) {
      console.debug('[chat/stream]', {
        requestedModel: payload.model,
        actualModelUsed: modelUsed,
        providerRequestId: requestId
      });
    }

    response.headers.set('X-LLM-Provider', 'openrouter');
    response.headers.set('X-Model-Used', modelUsed);

    return response;
  } catch (error) {
    const routeError: RouteError = {
      error: {
        message: error instanceof Error ? error.message : 'خطای ناشناخته در پردازش استریم.'
      }
    };

    const status = error instanceof OpenRouterApiError ? error.status : 500;

    if (error instanceof OpenRouterApiError && error.details !== undefined) {
      routeError.error.details = error.details;
    }

    return Response.json(routeError, {status, headers: RESPONSE_HEADERS});
  }
}
