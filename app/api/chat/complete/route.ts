import {AvalaiApiError, avalaiChatComplete, type AvalaiChatPayload} from '@/app/api/_lib/avalai';

export const runtime = 'nodejs';

const BACKEND_PROVIDER_HEADERS = {
  'X-Backend-Provider': 'avalai'
};

const IS_DEV = process.env.NODE_ENV !== 'production';

type RouteError = {
  error: {
    message: string;
    details?: unknown;
  };
};

function validatePayload(payload: unknown): AvalaiChatPayload {
  if (!payload || typeof payload !== 'object') {
    throw new AvalaiApiError(400, 'بدنه‌ی درخواست نامعتبر است.');
  }

  const body = payload as Record<string, unknown>;
  const messages = body.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new AvalaiApiError(400, 'آرایه‌ی messages الزامی است.');
  }

  for (const message of messages) {
    if (!message || typeof message !== 'object') {
      throw new AvalaiApiError(400, 'فرمت پیام نامعتبر است.');
    }

    const role = (message as Record<string, unknown>).role;
    const content = (message as Record<string, unknown>).content;

    if (!['system', 'user', 'assistant'].includes(String(role))) {
      throw new AvalaiApiError(400, 'role باید یکی از system، user یا assistant باشد.');
    }

    if (typeof content !== 'string' || !content.trim()) {
      throw new AvalaiApiError(400, 'content پیام باید رشته‌ی غیرخالی باشد.');
    }
  }

  return {
    model: typeof body.model === 'string' ? body.model : undefined,
    messages: messages as AvalaiChatPayload['messages'],
    temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
    max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : undefined,
    thinkingLevel: typeof body.thinkingLevel === 'string' ? body.thinkingLevel : undefined
  };
}

export async function POST(request: Request) {
  if (!process.env.AVALAI_API_KEY) {
    return Response.json(
      {error: {message: 'Missing AVALAI_API_KEY'}},
      {status: 500, headers: BACKEND_PROVIDER_HEADERS}
    );
  }

  try {
    const payload = validatePayload(await request.json());
    const result = await avalaiChatComplete(payload);

    if (IS_DEV) {
      console.debug('[chat/complete]', {
        requestedModel: payload.model,
        actualModelUsed: result.modelUsed,
        avalaiRequestId: result.requestId
      });
    }

    return Response.json(result.data, {
      status: 200,
      headers: {
        ...BACKEND_PROVIDER_HEADERS,
        'X-Model-Used': result.modelUsed
      }
    });
  } catch (error) {
    const routeError: RouteError = {
      error: {
        message: error instanceof Error ? error.message : 'خطای ناشناخته در پردازش درخواست.'
      }
    };

    if (error instanceof AvalaiApiError) {
      if (error.details !== undefined) {
        routeError.error.details = error.details;
      }
      return Response.json(routeError, {status: error.status, headers: BACKEND_PROVIDER_HEADERS});
    }

    return Response.json(routeError, {status: 500, headers: BACKEND_PROVIDER_HEADERS});
  }
}
