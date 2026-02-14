import {avalaiJson} from '@/src/server/avalai';
import {toErrorResponse} from '@/src/server/route-utils';
import {validateStreamChatInput} from '@/src/server/validation';

export async function POST(request: Request) {
  try {
    const payload = validateStreamChatInput(await request.json());
    const {data, requestId} = await avalaiJson<unknown>('/chat/completions', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        model: payload.model ?? 'gpt-oss-120b-aws-bedrock',
        messages: payload.messages,
        stream: false,
        temperature: payload.temperature,
        max_tokens: payload.max_tokens
      })
    });

    return Response.json(data, {
      headers: requestId ? {'X-AvalAI-Request-Id': requestId} : undefined
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
