const DEFAULT_AVALAI_BASE_URL = 'https://api.avalai.ir/v1';
const MODEL_FALLBACK_URLS = ['https://api.avalai.ir/v1/models', 'https://api.avalai.ir/v1beta/models'];

const IS_DEV = process.env.NODE_ENV !== 'production';

let cachedDefaultModel: string | null = null;

type ChatRole = 'system' | 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type AvalaiChatPayload = {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  thinkingLevel?: string;
};

type AvalaiErrorPayload = {
  error?: {
    message?: string;
    details?: unknown;
  };
};

type ModelsAttemptError = {
  endpoint: string;
  status: number;
  responseText: string;
};

export class AvalaiApiError extends Error {
  status: number;
  details?: unknown;
  requestId?: string;

  constructor(status: number, message: string, details?: unknown, requestId?: string) {
    super(message);
    this.name = 'AvalaiApiError';
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

function getAvalaiConfig() {
  const apiKey = process.env.AVALAI_API_KEY;
  if (!apiKey) {
    throw new AvalaiApiError(500, 'کلید API اوالای تنظیم نشده است.', {
      code: 'AVALAI_API_KEY_MISSING'
    });
  }

  const baseUrl = process.env.AVALAI_BASE_URL?.trim() || DEFAULT_AVALAI_BASE_URL;
  const defaultModel = process.env.AVALAI_DEFAULT_MODEL?.trim();

  return {
    apiKey,
    baseUrl,
    defaultModel: defaultModel || undefined
  };
}

function buildPayload(payload: AvalaiChatPayload, stream: boolean, model: string) {
  return {
    model,
    messages: payload.messages,
    temperature: payload.temperature,
    max_tokens: payload.max_tokens,
    stream,
    thinkingLevel: payload.thinkingLevel
    // TODO(BACKEND): map thinkingLevel to provider parameters
  };
}

async function readResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function parseAvalaiError(response: Response): Promise<never> {
  let details: unknown;
  let message: string;

  try {
    details = (await response.json()) as AvalaiErrorPayload;
    const payload = details as AvalaiErrorPayload;
    message = payload?.error?.message || `خطا در ارتباط با اوالای (HTTP ${response.status}).`;
    details = payload?.error?.details ?? details;
  } catch {
    const text = await readResponseText(response);
    details = text;
    message = text || `خطا در ارتباط با اوالای (HTTP ${response.status}).`;
  }

  const requestId = response.headers.get('x-request-id') ?? response.headers.get('x-avalai-request-id') ?? undefined;
  throw new AvalaiApiError(response.status, message, details, requestId);
}

function extractModelIds(payload: unknown): string[] {
  const list =
    payload && typeof payload === 'object' && Array.isArray((payload as {data?: unknown[]}).data)
      ? ((payload as {data: unknown[]}).data ?? [])
      : [];

  return list
    .map((item) => {
      if (!item || typeof item !== 'object') return undefined;
      const id = (item as {id?: unknown}).id;
      return typeof id === 'string' && id.trim() ? id.trim() : undefined;
    })
    .filter((item): item is string => Boolean(item));
}

function getModelsEndpoints(baseUrl: string) {
  return [`${baseUrl.replace(/\/$/, '')}/models`, ...MODEL_FALLBACK_URLS];
}

async function fetchModelsFromEndpoint(endpoint: string, apiKey: string) {
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw {
      endpoint,
      status: response.status,
      responseText: await readResponseText(response)
    } as ModelsAttemptError;
  }

  return response.json();
}

export async function getAvalaiModels() {
  const {apiKey, baseUrl} = getAvalaiConfig();
  const endpoints = getModelsEndpoints(baseUrl);
  const errors: ModelsAttemptError[] = [];

  for (const endpoint of endpoints) {
    try {
      const json = await fetchModelsFromEndpoint(endpoint, apiKey);
      return {json, endpoint};
    } catch (error) {
      errors.push(error as ModelsAttemptError);
    }
  }

  throw new AvalaiApiError(
    502,
    'دریافت لیست مدل‌های اوالای ناموفق بود.',
    {
      message: 'All model-list endpoints failed.',
      attempts: errors
    }
  );
}

async function getFallbackModel(excludeModel?: string) {
  const {json} = await getAvalaiModels();
  const modelIds = extractModelIds(json);

  if (modelIds.length === 0) {
    throw new AvalaiApiError(500, 'هیچ مدل معتبری برای این API Key پیدا نشد.', {
      code: 'AVALAI_MODELS_EMPTY',
      modelsPayload: json
    });
  }

  const preferred = modelIds.find((id) => id !== excludeModel) ?? modelIds[0];
  cachedDefaultModel = preferred;
  return preferred;
}

async function resolveRequestedModel(modelFromBody?: string) {
  const requested = modelFromBody?.trim();
  if (requested) return requested;

  const {defaultModel} = getAvalaiConfig();
  if (defaultModel) return defaultModel;

  if (cachedDefaultModel) return cachedDefaultModel;

  return getFallbackModel();
}

function isModelNotFound(status: number, message: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    status === 404 ||
    (normalizedMessage.includes('requested resource') && normalizedMessage.includes('does not exist'))
  );
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

async function sendChatRequest(payload: AvalaiChatPayload, model: string, stream: boolean) {
  const {apiKey, baseUrl} = getAvalaiConfig();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(stream ? {Accept: 'text/event-stream'} : {})
    },
    body: JSON.stringify(buildPayload(payload, stream, model))
  });

  if (!response.ok) {
    await parseAvalaiError(response);
  }

  const requestId = response.headers.get('x-request-id') ?? response.headers.get('x-avalai-request-id') ?? undefined;
  return {response, requestId};
}

async function sendChatWithModelFallback(payload: AvalaiChatPayload, stream: boolean) {
  const requestedModel = await resolveRequestedModel(payload.model);

  try {
    const result = await sendChatRequest(payload, requestedModel, stream);
    return {
      ...result,
      requestedModel,
      modelUsed: requestedModel
    };
  } catch (error) {
    if (!(error instanceof AvalaiApiError) || !isModelNotFound(error.status, error.message)) {
      throw error;
    }

    const fallbackModel = await getFallbackModel(requestedModel);
    const retried = await sendChatRequest(payload, fallbackModel, stream);

    return {
      ...retried,
      requestedModel,
      modelUsed: fallbackModel
    };
  }
}

export async function avalaiChatComplete(payload: AvalaiChatPayload) {
  const {response, modelUsed, requestedModel, requestId} = await sendChatWithModelFallback(payload, false);
  return {
    data: await response.json(),
    modelUsed,
    requestedModel,
    requestId
  };
}

export async function avalaiChatStream(payload: AvalaiChatPayload) {
  const {response: upstreamResponse, modelUsed, requestedModel, requestId} = await sendChatWithModelFallback(
    payload,
    true
  );

  if (!upstreamResponse.body) {
    throw new AvalaiApiError(502, 'پاسخ استریم از اوالای معتبر نبود.');
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

  const downstreamResponse = new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Model-Used': modelUsed,
      'X-Backend-Provider': 'avalai'
    }
  });

  if (IS_DEV) {
    console.debug('[avalai] stream response', {
      requestedModel,
      modelUsed,
      requestId
    });
  }

  return {
    response: downstreamResponse,
    modelUsed,
    requestedModel,
    requestId
  };
}
