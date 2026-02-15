const DEFAULT_AVALAI_BASE_URL = 'https://api.avalai.ir/v1';
const DEFAULT_MODEL = 'gpt-oss-120b-aws-bedrock';

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

export class AvalaiApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AvalaiApiError';
    this.status = status;
    this.details = details;
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

  return {
    apiKey,
    baseUrl,
    model: DEFAULT_MODEL
  };
}

function buildPayload(payload: AvalaiChatPayload, stream: boolean) {
  const {model} = getAvalaiConfig();

  return {
    model: payload.model?.trim() || model,
    messages: payload.messages,
    temperature: payload.temperature,
    max_tokens: payload.max_tokens,
    stream,
    thinkingLevel: payload.thinkingLevel
    // TODO(BACKEND): map thinkingLevel to provider parameters
  };
}

async function parseAvalaiError(response: Response) {
  let details: unknown;

  try {
    details = await response.json();
  } catch {
    details = await response.text();
  }

  const payload = details as AvalaiErrorPayload;
  const message = payload?.error?.message || `خطا در ارتباط با اوالای (HTTP ${response.status}).`;

  throw new AvalaiApiError(response.status, message, payload?.error?.details ?? details);
}

export async function avalaiChatComplete(payload: AvalaiChatPayload) {
  const {apiKey, baseUrl} = getAvalaiConfig();
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(buildPayload(payload, false))
  });

  if (!response.ok) {
    await parseAvalaiError(response);
  }

  return response.json();
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

export async function avalaiChatStream(payload: AvalaiChatPayload) {
  const {apiKey, baseUrl} = getAvalaiConfig();
  const upstreamResponse = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    body: JSON.stringify(buildPayload(payload, true))
  });

  if (!upstreamResponse.ok) {
    await parseAvalaiError(upstreamResponse);
  }

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

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
