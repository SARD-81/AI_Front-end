'use client';

import { useChatStore } from '@/store/useChatStore';
import { useThreadsStore } from '@/store/useThreadsStore';
import { useState } from 'react';

export function Composer() {
  const { activeThreadId } = useThreadsStore();
  const { sendMessage, streaming, stopStreaming, regenerateLast } = useChatStore();
  const [text, setText] = useState('');

  const onSend = async () => {
    if (!activeThreadId || !text.trim()) return;
    const next = text;
    setText('');
    await sendMessage(activeThreadId, next);
  };

  return (
    <div className="space-y-2">
      <textarea
        className="h-28 w-full rounded-xl border border-slate-700 bg-slate-900 p-3"
        placeholder="پیام خود را بنویسید…"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void onSend();
          }
        }}
      />
      <div className="flex gap-2">
        <button className="rounded bg-indigo-600 px-4 py-2" onClick={() => void onSend()}>
          ارسال
        </button>
        {streaming ? (
          <button className="rounded bg-rose-600 px-4 py-2" onClick={stopStreaming}>
            توقف
          </button>
        ) : (
          <button
            className="rounded bg-slate-700 px-4 py-2"
            onClick={() => {
              if (activeThreadId) {
                void regenerateLast(activeThreadId);
              }
            }}
          >
            تولید مجدد
          </button>
        )}
      </div>
    </div>
  );
}
