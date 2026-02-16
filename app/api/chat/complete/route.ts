import {
  OpenRouterApiError,
  openrouterChatComplete,
  validateChatPayload
} from '@/app/api/_lib/openrouter';

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
// curl -X POST http://localhost:3000/api/chat/complete \
//   -H "Content-Type: application/json" \
//   -d '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"سلام"}]}'
export async function POST(request: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json({error: {message: 'Missing OPENROUTER_API_KEY'}}, {status: 500, headers: RESPONSE_HEADERS});
  }

  try {
    const payload = validateChatPayload(await request.json());
    const result = await openrouterChatComplete(payload);

    if (IS_DEV) {
      console.debug('[chat/complete]', {
        requestedModel: payload.model,
        actualModelUsed: result.modelUsed,
        providerRequestId: result.requestId
      });
    }

    return Response.json(result.data, {
      status: 200,
      headers: {
        ...RESPONSE_HEADERS,
        'X-Model-Used': result.modelUsed
      }
    });
  } catch (error) {
    const routeError: RouteError = {
      error: {
        message: error instanceof Error ? error.message : 'خطای ناشناخته در پردازش درخواست.'
      }
    };

    if (error instanceof OpenRouterApiError) {
      if (error.details !== undefined) {
        routeError.error.details = error.details;
      }
      return Response.json(routeError, {status: error.status, headers: RESPONSE_HEADERS});
    }

    return Response.json(routeError, {status: 500, headers: RESPONSE_HEADERS});
  }
}
