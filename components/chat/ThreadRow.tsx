'use client';

import { Badge } from '@/components/ui/Badge';
import type { Thread } from '@/domain/types/chat';
import { useState } from 'react';

interface Props {
  thread: Thread;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function ThreadRow({ thread, active, onSelect, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(thread.title);

  return (
    <div className={`rounded-lg border p-2 ${active ? 'border-indigo-400 bg-indigo-950/40' : 'border-slate-700'}`}>
      {editing ? (
        <div className="space-y-2">
          <input className="w-full rounded bg-slate-800 px-2 py-1 text-sm" value={title} onChange={(event) => setTitle(event.target.value)} />
          <button
            className="rounded bg-indigo-500 px-2 py-1 text-xs"
            onClick={() => {
              onRename(title);
              setEditing(false);
            }}
          >
            ذخیره
          </button>
        </div>
      ) : (
        <>
          <button className="w-full text-right" onClick={onSelect}>
            <p className="truncate text-sm font-semibold">{thread.title}</p>
            <p className="truncate text-xs text-slate-300">{thread.preview}</p>
            <div className="mt-1 flex gap-1">{thread.tags?.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
            {thread.isStreaming ? <p className="mt-1 text-[10px] text-emerald-300">در حال پاسخ…</p> : null}
          </button>
          <div className="mt-2 flex gap-2 text-xs">
            <button className="rounded bg-slate-700 px-2 py-1" onClick={() => setEditing(true)}>
              تغییر نام
            </button>
            <button className="rounded bg-rose-700 px-2 py-1" onClick={onDelete}>
              حذف
            </button>
          </div>
        </>
      )}
    </div>
  );
}
