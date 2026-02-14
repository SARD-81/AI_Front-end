'use client';

import { ThreadRow } from '@/components/chat/ThreadRow';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useThreadsStore } from '@/store/useThreadsStore';
import { useEffect, useState } from 'react';

const tags = ['همه', 'کار', 'شخصی', 'باگ', 'تحقیق'];

export function ThreadList() {
  const { threads, activeThreadId, fetchThreads, setActiveThread, createThread, renameThread, deleteThread, loading, setTagFilter } =
    useThreadsStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    void fetchThreads();
  }, [fetchThreads]);

  return (
    <div className="flex h-full flex-col gap-3">
      <h2 className="text-lg font-bold">گفتگوها</h2>
      <Button onClick={() => void createThread()}>گفتگوی جدید</Button>
      <Input
        placeholder="جستجو در گفتگوها"
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          void fetchThreads(nextQuery);
        }}
      />
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <button key={tag} className="rounded bg-slate-800 px-2 py-1 text-xs" onClick={() => setTagFilter(tag === 'همه' ? undefined : tag)}>
            {tag}
          </button>
        ))}
      </div>

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
