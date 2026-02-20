import type {LlmProvider, SendStreamingChatInput} from '@/lib/llm/types';

type OpenRouterChunk = {
  choices?: Array<{
    delta?: {content?: string};
  }>;
};

type OpenRouterCompletionResponse = {
  choices?: Array<{
    message?: {content?: string};
  }>;
};

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as {message?: string; error?: {message?: string}};
    return payload.message ?? payload.error?.message ?? 'درخواست به BFF ناموفق بود.';
  } catch {
    return 'درخواست به BFF ناموفق بود.';
  }
}

async function fallbackComplete(input: SendStreamingChatInput) {
  const response = await fetch('/api/chat/complete', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as OpenRouterCompletionResponse;
  return payload.choices?.[0]?.message?.content?.trim() ?? '';
}

export class OpenRouterBffProvider implements LlmProvider {
  async sendStreamingChat(
    input: SendStreamingChatInput,
    onToken: (token: string) => void,
    onDone: () => void
  ): Promise<void> {
    let streamedText = '';

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(input)
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
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            if (streamedText.trim()) {
              onDone();
              return;
            }

            throw new Error('Streaming returned empty response.');
          }

          const chunk = JSON.parse(data) as OpenRouterChunk;
          const delta = chunk.choices?.[0]?.delta?.content;

          if (delta) {
            streamedText += delta;
            onToken(delta);
          }
        }

        if (done) break;
      }
    } catch {
      // fallback to complete
    }

    const content = await fallbackComplete(input);

    if (!content) {
      throw new Error('پاسخ خالی دریافت شد.');
    }

    onToken(content);
    onDone();
  }
}
