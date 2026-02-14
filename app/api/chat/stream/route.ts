import {avalaiStream} from '@/src/server/avalai';
import {toErrorResponse} from '@/src/server/route-utils';
import {validateStreamChatInput} from '@/src/server/validation';

function toSseToken(token: string) {
  return `event: token\ndata: ${JSON.stringify({token})}\n\n`;
}

export async function POST(request: Request) {
  try {
    const payload = validateStreamChatInput(await request.json());
    const {response, requestId} = await avalaiStream('/chat/completions', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        model: payload.model ?? 'gpt-oss-120b-aws-bedrock',
        messages: payload.messages,
        stream: true,
        temperature: payload.temperature,
        max_tokens: payload.max_tokens
      })
    });

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = '';

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.error(new Error('Missing stream reader.'));
          return;
        }

        try {
          while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, {stream: true});

            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const rawLine of lines) {
              const line = rawLine.trim();
              if (!line) continue;

              if (!line.startsWith('data:')) {
                controller.enqueue(encoder.encode(toSseToken(line)));
                continue;
              }

              const data = line.slice(5).trim();
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('event: done\ndata: {"done":true}\n\n'));
                continue;
              }

              try {
                const json = JSON.parse(data) as {
                  choices?: Array<{delta?: {content?: string}; message?: {content?: string}}>
                };
                const token =
                  json.choices?.[0]?.delta?.content ??
                  json.choices?.[0]?.message?.content ??
                  '';
                if (token) {
                  controller.enqueue(encoder.encode(toSseToken(token)));
                }
              } catch {
                controller.enqueue(encoder.encode(toSseToken(data)));
              }
            }
          }

          if (buffer.trim()) {
            controller.enqueue(encoder.encode(toSseToken(buffer.trim())));
          }
          controller.enqueue(encoder.encode('event: done\ndata: {"done":true}\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        ...(requestId ? {'X-AvalAI-Request-Id': requestId} : {})
      }
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
