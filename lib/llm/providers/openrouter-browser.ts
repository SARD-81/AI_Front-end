import {assertDemoModeReady, llmConfig} from '@/lib/config/llm';
import type {LlmMessage, LlmProvider, SendStreamingChatInput} from '@/lib/llm/types';

const DEFAULT_TEMPERATURE = 0.7;

type OpenRouterChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

type OpenRouterCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function buildHeaders() {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${llmConfig.openRouter.apiKey ?? ''}`,
    'Content-Type': 'application/json'
  };

  if (llmConfig.openRouter.siteUrl) {
    headers['HTTP-Referer'] = llmConfig.openRouter.siteUrl;
  }

  if (llmConfig.openRouter.appName) {
    headers['X-Title'] = llmConfig.openRouter.appName;
  }

  return headers;
}

function buildBody(messages: LlmMessage[], model?: string, temperature?: number, stream = true) {
  return {
    model: model ?? llmConfig.openRouter.defaultModel,
    stream,
    messages,
    temperature: temperature ?? DEFAULT_TEMPERATURE
  };
}

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as {error?: {message?: string}; message?: string};
    return payload.error?.message ?? payload.message ?? 'درخواست به OpenRouter ناموفق بود.';
  } catch {
    return 'درخواست به OpenRouter ناموفق بود.';
  }
}

export class OpenRouterBrowserProvider implements LlmProvider {
  // TODO(SECURITY): DEMO-ONLY. Remove browser-direct OpenRouter calls before real production and route through backend.
  async sendStreamingChat(
    input: SendStreamingChatInput,
    onToken: (token: string) => void,
    onDone: () => void
  ): Promise<void> {
    assertDemoModeReady();

    const endpoint = `${llmConfig.openRouter.baseUrl}/chat/completions`;
    const headers = buildHeaders();
    const body = buildBody(input.messages, input.options?.model, input.options?.temperature, true);

    let streamedText = '';
    let streamWorked = false;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok || !response.body) {
        throw new Error(await readErrorMessage(response));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const {done, value} = await reader.read();

        if (done) {
          buffer += decoder.decode();
        } else if (value) {
          buffer += decoder.decode(value, {stream: true});
        }

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line || !line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            streamWorked = streamedText.length > 0;
            onDone();
            return;
          }

          const chunk = JSON.parse(data) as OpenRouterChunk;
          const delta = chunk.choices?.[0]?.delta?.content;

          if (delta) {
            streamedText += delta;
            streamWorked = true;
            onToken(delta);
          }
        }

        if (done) break;
      }
    } catch {
      // fallback below
    }

    if (!streamWorked) {
      const fallbackResponse = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(buildBody(input.messages, input.options?.model, input.options?.temperature, false))
      });

      if (!fallbackResponse.ok) {
        throw new Error(await readErrorMessage(fallbackResponse));
      }

      const payload = (await fallbackResponse.json()) as OpenRouterCompletionResponse;
      const content = payload.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new Error('پاسخ خالی از OpenRouter دریافت شد.');
      }

      onToken(content);
    }

    onDone();
  }
}
