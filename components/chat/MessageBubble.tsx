'use client';

import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { IconButton } from '@/components/ui/IconButton';
import { MarkdownView } from '@/components/chat/MarkdownView';
import { ToolCallView } from '@/components/chat/ToolCallView';
import type { Message } from '@/domain/types/chat';
import { useChatStore } from '@/store/useChatStore';
import { useThreadsStore } from '@/store/useThreadsStore';
import { useToastStore } from '@/components/ui/Toast';
import { useState } from 'react';

const dateFormatter = new Intl.DateTimeFormat('fa-IR', {
  hour: '2-digit',
  minute: '2-digit',
});

export function MessageBubble({ message }: { message: Message }) {
  const activeThreadId = useThreadsStore((s) => s.activeThreadId);
  const { regenerateLast, editLastUserMessageAndRerun, togglePin } = useChatStore();
  const showToast = useToastStore((s) => s.show);
  const [openMeta, setOpenMeta] = useState(false);

  const bubbleClass =
    message.role === 'user'
      ? 'bg-indigo-700 mr-auto'
      : message.role === 'assistant'
        ? 'bg-slate-800'
        : message.role === 'system'
          ? 'bg-amber-900/60'
          : 'bg-cyan-900/50';

  return (
    <article className={`max-w-3xl rounded-xl p-3 ${bubbleClass}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-slate-300">{message.role}</p>
        <DropdownMenu
          trigger={<IconButton aria-label="actions">⋯</IconButton>}
        >
          <div className="grid gap-1 text-xs">
            <button onClick={() => navigator.clipboard.writeText(message.content).then(() => showToast('کپی شد'))}>کپی متن</button>
            <button onClick={() => navigator.clipboard.writeText(message.content).then(() => showToast('کپی شد'))}>کپی Markdown</button>
            <button onClick={() => showToast(`نقل‌قول: ${message.content.slice(0, 24)}...`)}>نقل‌قول</button>
            {activeThreadId ? <button onClick={() => void regenerateLast(activeThreadId)}>تولید مجدد پاسخ</button> : null}
            {activeThreadId && message.role === 'user' ? (
              <button onClick={() => void editLastUserMessageAndRerun(activeThreadId, `${message.content} (ویرایش شد)`) }>ویرایش پیام کاربر</button>
            ) : null}
            {activeThreadId ? <button onClick={() => togglePin(activeThreadId, message.id)}>{message.pinned ? 'برداشتن سنجاق' : 'سنجاق کردن'}</button> : null}
          </div>
        </DropdownMenu>
      </div>
      {message.role === 'tool' && message.toolCall ? <ToolCallView toolCall={message.toolCall} /> : <MarkdownView content={message.content} />}
      <p className="mt-2 text-[10px] text-slate-400">{dateFormatter.format(new Date(message.createdAt))}</p>
      <button className="mt-1 text-[10px] text-slate-400" onClick={() => setOpenMeta((v) => !v)}>
        متادیتا {openMeta ? '▴' : '▾'}
      </button>
      {openMeta ? (
        <pre className="mt-1 overflow-auto rounded bg-black/30 p-2 text-[10px] text-slate-300">
{JSON.stringify(
  {
    messageId: message.id,
    createdAt: message.createdAt,
    model: message.model,
    latency: message.metrics?.latencyMs,
    tokenUsage: { in: message.metrics?.tokensIn, out: message.metrics?.tokensOut },
    rawToolCalls: message.rawToolCalls,
    safety: message.safety,
  },
  null,
  2,
)}
        </pre>
      ) : null}
      {message.error ? <p className="mt-1 text-xs text-rose-300">{message.error}</p> : null}
    </article>
  );
}
