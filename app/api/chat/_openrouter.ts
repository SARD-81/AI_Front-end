import type {SendStreamingChatInput} from '@/lib/llm/types';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

type OpenRouterErrorPayload = {
  error?: {message?: string};
  message?: string;
};

function readOptionalEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readRequiredApiKey() {
  const apiKey = readOptionalEnv(process.env.OPENROUTER_API_KEY);

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set.');
  }

  return apiKey;
}

export function buildOpenRouterRequestBody(input: SendStreamingChatInput, stream: boolean) {
  return {
    model: input.options?.model ?? readOptionalEnv(process.env.OPENROUTER_DEFAULT_MODEL) ?? DEFAULT_MODEL,
    messages: input.messages,
    temperature: input.options?.temperature ?? 0.7,
    stream
  };
}

export async function callOpenRouter(input: SendStreamingChatInput, stream: boolean) {
  const apiKey = readRequiredApiKey();
  const baseUrl = readOptionalEnv(process.env.OPENROUTER_BASE_URL) ?? DEFAULT_BASE_URL;
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  const siteUrl = readOptionalEnv(process.env.OPENROUTER_SITE_URL);
  const appName = readOptionalEnv(process.env.OPENROUTER_APP_NAME);

  if (siteUrl) headers['HTTP-Referer'] = siteUrl;
  if (appName) headers['X-Title'] = appName;

  return fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(buildOpenRouterRequestBody(input, stream))
  });
}

export async function readUpstreamError(response: Response) {
  try {
    const payload = (await response.json()) as OpenRouterErrorPayload;
    return payload.error?.message ?? payload.message ?? 'OpenRouter request failed.';
  } catch {
    return 'OpenRouter request failed.';
  }
}
