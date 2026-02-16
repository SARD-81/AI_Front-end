const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini';

type ChatRole = 'system' | 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type OpenRouterChatPayload = {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  thinkingLevel?: string;
};

type OpenRouterErrorPayload = {
  error?: {
    message?: string;
    metadata?: unknown;
  };
};

export class OpenRouterApiError extends Error {
  status: number;
  details?: unknown;
  requestId?: string;

  constructor(status: number, message: string, details?: unknown, requestId?: string) {
    super(message);
    this.name = 'OpenRouterApiError';
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

export function validateChatPayload(payload: unknown): OpenRouterChatPayload {
  if (!payload || typeof payload !== 'object') {
    throw new OpenRouterApiError(400, 'بدنه‌ی درخواست نامعتبر است.');
  }

  const body = payload as Record<string, unknown>;
  const messages = body.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new OpenRouterApiError(400, 'آرایه‌ی messages الزامی است.');
  }

  for (const message of messages) {
    if (!message || typeof message !== 'object') {
      throw new OpenRouterApiError(400, 'فرمت پیام نامعتبر است.');
    }

    const role = (message as Record<string, unknown>).role;
    const content = (message as Record<string, unknown>).content;

    if (!['system', 'user', 'assistant'].includes(String(role))) {
      throw new OpenRouterApiError(400, 'role باید یکی از system، user یا assistant باشد.');
    }

    if (typeof content !== 'string' || !content.trim()) {
      throw new OpenRouterApiError(400, 'content پیام باید رشته‌ی غیرخالی باشد.');
    }
  }

  return {
    model: typeof body.model === 'string' ? body.model : undefined,
    messages: messages as ChatMessage[],
    temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
    max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : undefined,
    thinkingLevel: typeof body.thinkingLevel === 'string' ? body.thinkingLevel : undefined
  };
}

function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new OpenRouterApiError(500, 'Missing OPENROUTER_API_KEY');
  }

  return {
    apiKey,
    baseUrl: process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_OPENROUTER_BASE_URL,
    defaultModel: process.env.OPENROUTER_DEFAULT_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
    siteUrl: process.env.OPENROUTER_SITE_URL?.trim(),
    appName: process.env.OPENROUTER_APP_NAME?.trim()
  };
}

function readRequestId(headers: Headers) {
  return headers.get('x-request-id') ?? headers.get('x-openrouter-request-id') ?? undefined;
}

function buildOpenRouterHeaders(config: ReturnType<typeof getOpenRouterConfig>, stream: boolean) {
  return {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
    ...(stream ? {Accept: 'text/event-stream'} : {}),
    ...(config.siteUrl ? {'HTTP-Referer': config.siteUrl} : {}),
    ...(config.appName ? {'X-Title': config.appName} : {})
  };
}

function buildChatBody(payload: OpenRouterChatPayload, stream: boolean, defaultModel: string) {
  return {
    model: payload.model?.trim() || defaultModel,
    messages: payload.messages,
    temperature: payload.temperature ?? 0.7,
    max_tokens: payload.max_tokens ?? 512,
    stream,
    thinkingLevel: payload.thinkingLevel
    // TODO(BACKEND): map thinkingLevel to provider parameters when finalized.
  };
}

async function readResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function parseOpenRouterError(response: Response): Promise<never> {
  let details: unknown;
  let message = `خطا در ارتباط با OpenRouter (HTTP ${response.status}).`;

  try {
    details = (await response.json()) as OpenRouterErrorPayload;
    const payload = details as OpenRouterErrorPayload;
    message = payload.error?.message?.trim() || message;
    details = payload.error?.metadata ?? details;
  } catch {
    const text = await readResponseText(response);
    if (text) {
      message = text;
      details = text;
    }
  }

  throw new OpenRouterApiError(response.status, message, details, readRequestId(response.headers));
}

async function sendChatRequest(payload: OpenRouterChatPayload, stream: boolean) {
  const config = getOpenRouterConfig();
  const model = payload.model?.trim() || config.defaultModel;

  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: buildOpenRouterHeaders(config, stream),
    body: JSON.stringify(buildChatBody(payload, stream, config.defaultModel))
  });

  if (!response.ok) {
    await parseOpenRouterError(response);
  }

  return {
    response,
    requestId: readRequestId(response.headers),
    modelUsed: model
  };
}

function extractTextFromSseData(dataLine: string) {
  if (!dataLine || dataLine === '[DONE]') {
    return dataLine;
  }

  try {
    const parsed = JSON.parse(dataLine) as {
      choices?: Array<{delta?: {content?: string}; message?: {content?: string}; text?: string}>;
    };

    const choice = parsed.choices?.[0];
    return choice?.delta?.content ?? choice?.message?.content ?? choice?.text ?? '';
  } catch {
    return '';
  }
}

export async function openrouterChatComplete(payload: OpenRouterChatPayload) {
  const {response, requestId, modelUsed} = await sendChatRequest(payload, false);
  return {
    data: await response.json(),
    requestId,
    modelUsed
  };
}

export async function openrouterChatStream(payload: OpenRouterChatPayload) {
  const {response: upstreamResponse, requestId, modelUsed} = await sendChatRequest(payload, true);

  if (!upstreamResponse.body) {
    throw new OpenRouterApiError(502, 'پاسخ استریم از OpenRouter معتبر نبود.');
  }

  const contentType = upstreamResponse.headers.get('content-type') ?? '';
  const isSse = contentType.includes('text/event-stream');

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstreamResponse.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = '';

      while (true) {
        const {value, done} = await reader.read();
        if (done) {
          if (!isSse && buffer) {
            controller.enqueue(encoder.encode(buffer));
          }
          controller.close();
          break;
        }

        const decoded = decoder.decode(value, {stream: true});

        if (!isSse) {
          controller.enqueue(encoder.encode(decoded));
          continue;
        }

        buffer += decoded;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) {
            continue;
          }

          const data = line.replace(/^data:\s*/, '');
          const extracted = extractTextFromSseData(data);

          if (extracted === '[DONE]') {
            controller.close();
            return;
          }

          if (extracted) {
            controller.enqueue(encoder.encode(extracted));
          }
        }
      }
    }
  });

  return {
    response: new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Model-Used': modelUsed,
        'X-LLM-Provider': 'openrouter'
      }
    }),
    requestId,
    modelUsed
  };
}
