'use client';

import type { ToolCall } from '@/domain/types/chat';

export function ToolCallView({ toolCall }: { toolCall: ToolCall }) {
  return (
    <details className="rounded border border-cyan-700 bg-cyan-950/40 p-3 text-xs">
      <summary className="cursor-pointer font-semibold">خروجی ابزار: {toolCall.name}</summary>
      <pre className="mt-2 overflow-auto rounded bg-slate-900 p-2">{JSON.stringify(toolCall.payload, null, 2)}</pre>
    </details>
  );
}
