'use client';

import { groupThreadsByUpdatedAt } from '@/domain/services/groupThreads';
import { useThreadsStore } from '@/store/useThreadsStore';
import { useUiStore } from '@/store/useUiStore';
import { useEffect, useMemo, useState } from 'react';

export function Sidebar() {
  const { threads, activeThreadId, fetchThreads, setActiveThread, createThread, loading } = useThreadsStore();
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void fetchThreads();
  }, [fetchThreads]);

  const groupedThreads = useMemo(() => groupThreadsByUpdatedAt(threads), [threads]);

  return (
    <aside className="flex h-full min-h-0 w-[300px] flex-col rounded-2xl border border-slate-800 bg-gradient-to-b from-[#111827] via-[#0e1525] to-[#0a0f1a] p-3 transition-[width] duration-200 ease-out">
      <header className="mb-3 flex h-12 items-center gap-2 px-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
            <path d="M12 2 4 6.5v11L12 22l8-4.5v-11L12 2Zm-1.6 4.8h3.2l3.6 2.1-1.6.9-3.6-2.1-3.6 2.1-1.6-.9 3.6-2.1Zm-2.8 4.1 3.6 2.1v4.2l-3.6-2.1v-4.2Zm8.8 0v4.2l-3.6 2.1v-4.2l3.6-2.1Z" />
          </svg>
        </span>
        <p className="text-sm font-semibold tracking-wide text-slate-100">deepseek</p>
        <button
          className="ms-auto rounded-md p-1.5 text-slate-400 transition hover:bg-slate-700/50 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          type="button"
          aria-label="بستن نوار کناری"
          title="بستن نوار کناری"
          onClick={toggleSidebar}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </svg>
        </button>
      </header>

      <button
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
        type="button"
        onClick={() => {
          // TODO(BE): create thread endpoint; for demo use MSW.
          void createThread();
        }}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-500 text-xs">+</span>
        <span dir="ltr">New chat</span>
      </button>

      <div className="mb-3">
        <input
          className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
          placeholder="جستجو در گفتگوها"
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            void fetchThreads(nextQuery);
          }}
        />
      </div>

      {loading ? <p className="mb-2 text-xs text-slate-400">در حال بارگذاری...</p> : null}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pe-1">
        {groupedThreads.map((group) => (
          <section key={group.label} className="space-y-1.5">
            <p className="px-2 text-[11px] font-medium text-slate-500" dir="ltr">
              {group.label}
            </p>
            {group.threads.map((thread) => {
              const active = thread.id === activeThreadId;
              return (
                <button
                  key={thread.id}
                  className={`block w-full rounded-lg px-2 py-2 text-right text-sm transition ${
                    active ? 'bg-slate-700/50 text-slate-50' : 'text-slate-300 hover:bg-slate-800/70 hover:text-slate-100'
                  }`}
                  onClick={() => setActiveThread(thread.id)}
                  type="button"
                >
                  <span className="block truncate">{thread.title}</span>
                </button>
              );
            })}
          </section>
        ))}
      </div>

      <button
        type="button"
        className="mt-3 flex w-full items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-2 py-2 text-right hover:bg-slate-800"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold">S</span>
        <span className="truncate text-sm text-slate-200">Sina Sharifi با نام طولانی نمایشی</span>
      </button>
    </aside>
  );
}
