'use client';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useChatStore } from '@/store/useChatStore';
import { useThreadsStore } from '@/store/useThreadsStore';
import { useUiStore } from '@/store/useUiStore';
import { useEffect, useRef, useState } from 'react';

export function Composer() {
  const { activeThreadId } = useThreadsStore();
  const { sendMessage, streamState, stopStreaming, regenerateLast, attachments, addAttachments, clearAttachments } = useChatStore();
  const quoteText = useUiStore((s) => s.quoteText);
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (quoteText) setText((prev) => `${prev}\n> ${quoteText}\n`);
  }, [quoteText]);

  const onSend = async () => {
    if (!activeThreadId || !text.trim()) return;
    const next = text;
    setText('');
    await sendMessage(activeThreadId, next);
  };

  return (
    <div className="space-y-2">
      <div
        className="rounded-xl border border-dashed border-slate-700 p-2 text-xs text-slate-300"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void addAttachments(event.dataTransfer.files);
        }}
      >
        فایل را اینجا رها کنید یا
        <button className="mr-1 underline" onClick={() => fileRef.current?.click()}>
          انتخاب فایل
        </button>
        <input
          ref={fileRef}
          hidden
          type="file"
          multiple
          onChange={(event) => {
            if (event.target.files) void addAttachments(event.target.files);
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs">
            {attachment.previewUrl ? <img src={attachment.previewUrl} alt={attachment.name} className="mb-1 h-10 w-10 rounded object-cover" /> : null}
            {attachment.name}
          </div>
        ))}
        {attachments.length ? (
          <button className="text-xs text-rose-300" onClick={clearAttachments}>
            پاک‌کردن فایل‌ها
          </button>
        ) : null}
      </div>
      <Textarea
        className="h-28"
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
        <Button onClick={() => void onSend()}>ارسال</Button>
        {streamState === 'streaming' || streamState === 'connecting' ? (
          <Button className="bg-rose-600" onClick={stopStreaming}>
            توقف
          </Button>
        ) : (
          <Button
            className="bg-slate-700"
            onClick={() => {
              if (activeThreadId) {
                void regenerateLast(activeThreadId);
              }
            }}
          >
            تولید مجدد
          </Button>
        )}
      </div>
    </div>
  );
}
