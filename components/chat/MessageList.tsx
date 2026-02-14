'use client';

import { MessageBubble } from '@/components/chat/MessageBubble';
import { useChatStore } from '@/store/useChatStore';
import { useThreadsStore } from '@/store/useThreadsStore';
import { useEffect, useMemo, useRef, useState } from 'react';

export function MessageList() {
  const { activeThreadId } = useThreadsStore();
  const { messagesByThread, fetchMessages, errorByThread, retryLast } = useChatStore();
  const ref = useRef<HTMLDivElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  useEffect(() => {
    if (activeThreadId) {
      void fetchMessages(activeThreadId);
    }
  }, [activeThreadId, fetchMessages]);

  const messages = useMemo(() => (activeThreadId ? messagesByThread[activeThreadId] ?? [] : []), [activeThreadId, messagesByThread]);

  useEffect(() => {
    if (!ref.current || !stickToBottom) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages, stickToBottom]);

  return (
    <div
      ref={ref}
      className="flex-1 space-y-3 overflow-auto rounded-xl border border-slate-700 p-4"
      onScroll={(event) => {
        const el = event.currentTarget;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        setStickToBottom(nearBottom);
      }}
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {activeThreadId && errorByThread[activeThreadId] ? (
        <div className="rounded-lg border border-rose-700 bg-rose-950/40 p-3 text-sm">
          <p>{errorByThread[activeThreadId]}</p>
          <button className="mt-2 rounded bg-rose-700 px-2 py-1 text-xs" onClick={() => void retryLast(activeThreadId)}>
            تلاش مجدد
          </button>
          <p className="mt-2 text-xs text-slate-300">
            {errorByThread[activeThreadId]?.includes('401') || errorByThread[activeThreadId]?.includes('403')
              ? 'TODO(BE): در این وضعیت باید رفرش توکن یا هدایت به ورود انجام شود.'
              : null}
            {errorByThread[activeThreadId]?.includes('429')
              ? ' TODO(BE): مقدار Retry-After از هدر خوانده شود.'
              : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}
