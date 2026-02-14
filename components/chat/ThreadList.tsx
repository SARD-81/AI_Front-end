'use client';

import { ThreadRow } from '@/components/chat/ThreadRow';
import { useThreadsStore } from '@/store/useThreadsStore';
import { useEffect, useState } from 'react';

export function ThreadList() {
  const { threads, activeThreadId, fetchThreads, setActiveThread, createThread, renameThread, deleteThread, loading } =
    useThreadsStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    void fetchThreads();
  }, [fetchThreads]);

  return (
    <div className="flex h-full flex-col gap-3">
      <h2 className="text-lg font-bold">گفتگوهای من</h2>
      <button className="rounded bg-indigo-600 px-3 py-2 text-sm" onClick={() => void createThread()}>
        گفتگوی جدید
      </button>
      <input
        className="rounded bg-slate-800 px-3 py-2 text-sm"
        placeholder="جستجو در گفتگوها"
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          void fetchThreads(nextQuery);
        }}
      />

      {loading && <p className="text-xs text-slate-400">در حال بارگذاری...</p>}
      <div className="space-y-2 overflow-auto">
        {threads.map((thread) => (
          <ThreadRow
            key={thread.id}
            thread={thread}
            active={thread.id === activeThreadId}
            onSelect={() => setActiveThread(thread.id)}
            onRename={(title) => void renameThread(thread.id, title)}
            onDelete={() => void deleteThread(thread.id)}
          />
        ))}
      </div>
    </div>
  );
}
