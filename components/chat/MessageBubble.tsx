'use client';

import { MarkdownView } from '@/components/chat/MarkdownView';
import { ToolCallView } from '@/components/chat/ToolCallView';
import type { Message } from '@/domain/types/chat';

const dateFormatter = new Intl.DateTimeFormat('fa-IR', {
  hour: '2-digit',
  minute: '2-digit',
});

export function MessageBubble({ message }: { message: Message }) {
  const bubbleClass =
    message.role === 'user'
      ? 'bg-indigo-700 mr-auto'
      : message.role === 'assistant'
        ? 'bg-slate-800'
        : message.role === 'system'
          ? 'bg-amber-900/60'
          : 'bg-cyan-900/50';

  return (
    <div className={`max-w-3xl rounded-xl p-3 ${bubbleClass}`}>
      <p className="mb-2 text-xs text-slate-300">{message.role}</p>
      {message.role === 'tool' && message.toolCall ? <ToolCallView toolCall={message.toolCall} /> : <MarkdownView content={message.content} />}
      <p className="mt-2 text-[10px] text-slate-400">{dateFormatter.format(new Date(message.createdAt))}</p>
      {message.error ? <p className="mt-1 text-xs text-rose-300">{message.error}</p> : null}
    </div>
  );
}
