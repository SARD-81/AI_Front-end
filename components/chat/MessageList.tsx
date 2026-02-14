'use client';

import { MessageBubble } from '@/components/chat/MessageBubble';
import { Button } from '@/components/ui/Button';
import { useChatStore } from '@/store/useChatStore';
import { useThreadsStore } from '@/store/useThreadsStore';
import { useEffect, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';

export function MessageList() {
  const activeThreadId = useThreadsStore((s) => s.activeThreadId);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const messagesByThread = useChatStore((s) => s.messagesByThread);
  const errorByThread = useChatStore((s) => s.errorByThread);
  const retryLast = useChatStore((s) => s.retryLast);
  const hasMoreByThread = useChatStore((s) => s.hasMoreByThread);

  useEffect(() => {
    if (activeThreadId) void fetchMessages(activeThreadId, true);
  }, [activeThreadId, fetchMessages]);

  const messages = useMemo(() => (activeThreadId ? messagesByThread[activeThreadId] ?? [] : []), [activeThreadId, messagesByThread]);
  const pinned = messages.filter((m) => m.pinned);

  return (
    <section className="flex-1 rounded-xl border border-slate-700 p-2" role="log" aria-live="polite">
      {pinned.length ? (
        <div className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
          <p className="mb-1">پیام‌های سنجاق‌شده</p>
          {pinned.map((message) => (
            <p key={`pin-${message.id}`} className="truncate">• {message.content}</p>
          ))}
        </div>
      ) : null}

      {activeThreadId && hasMoreByThread[activeThreadId] ? (
        <Button className="mb-2 bg-slate-700" onClick={() => void fetchMessages(activeThreadId, false)}>
          بارگذاری پیام‌های قبلی
        </Button>
      ) : null}

      <Virtuoso
        style={{ height: '60vh' }}
        data={messages}
        itemContent={(_, message) => <MessageBubble key={message.id} message={message} />}
      />

      {activeThreadId && errorByThread[activeThreadId] ? (
        <div className="mt-2 rounded-lg border border-rose-700 bg-rose-950/40 p-3 text-sm">
          <p>{errorByThread[activeThreadId]}</p>
          <button className="mt-2 rounded bg-rose-700 px-2 py-1 text-xs" onClick={() => void retryLast(activeThreadId)}>
            تلاش مجدد
          </button>
        </div>
      ) : null}
    </section>
  );
}
