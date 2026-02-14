'use client';

import { useThreadsStore } from '@/store/useThreadsStore';
import { useUiStore } from '@/store/useUiStore';

export function SidebarRail() {
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const createThread = useThreadsStore((state) => state.createThread);

  return (
    <aside className="flex h-full min-h-0 w-[72px] flex-col rounded-2xl border border-slate-800 bg-gradient-to-b from-[#111827] via-[#0e1525] to-[#0a0f1a] p-2 transition-[width] duration-200 ease-out">
      <div className="flex flex-row items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
            <path d="M12 2 4 6.5v11L12 22l8-4.5v-11L12 2Zm-1.6 4.8h3.2l3.6 2.1-1.6.9-3.6-2.1-3.6 2.1-1.6-.9 3.6-2.1Zm-2.8 4.1 3.6 2.1v4.2l-3.6-2.1v-4.2Zm8.8 0v4.2l-3.6 2.1v-4.2l3.6-2.1Z" />
          </svg>
        </span>
        <div className="flex h-9 items-center gap-1 rounded-full border border-slate-700 bg-[#2a2a2f] p-1">
          <button
            type="button"
            className="rounded-full p-1.5 text-slate-200 transition hover:bg-slate-600/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            onClick={toggleSidebar}
            aria-label="باز کردن نوار کناری"
            title="باز کردن نوار کناری"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
            </svg>
          </button>
          <button
            type="button"
            className="rounded-full p-1.5 text-slate-200 transition hover:bg-slate-600/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            onClick={() => {
              // TODO(BE): create thread endpoint; for demo use MSW.
              void createThread();
            }}
            aria-label="گفتگوی جدید"
            title="گفتگوی جدید"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2V6Z" />
              <path d="M12 7v6" />
              <path d="M9 10h6" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
