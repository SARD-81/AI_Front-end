import {NextResponse} from 'next/server';
import type {SendStreamingChatInput} from '@/lib/llm/types';
import {callOpenRouter, readUpstreamError} from '../_openrouter';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const input = (await request.json().catch(() => null)) as SendStreamingChatInput | null;

  if (!input || !Array.isArray(input.messages)) {
    return NextResponse.json({message: 'Invalid request payload.'}, {status: 400});
  }

  let upstream: Response;

  try {
    upstream = await callOpenRouter(input, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to call OpenRouter.';
    return NextResponse.json({message}, {status: 500});
  }

  if (!upstream.ok || !upstream.body) {
    const message = await readUpstreamError(upstream);
    return NextResponse.json({message}, {status: upstream.status || 502});
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
