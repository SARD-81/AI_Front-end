'use client';

import { Composer } from '@/components/chat/Composer';
import { MessageList } from '@/components/chat/MessageList';
import { ThreadList } from '@/components/chat/ThreadList';
import { env } from '@/lib/di/env';

export function AppShell() {
  return (
    <div className="grid h-screen grid-cols-12 gap-4 p-4">
      <aside className="col-span-12 rounded-2xl border border-slate-700 bg-slate-900/50 p-4 lg:col-span-3">
        <ThreadList />
      </aside>
      <main className="col-span-12 flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900/30 p-4 lg:col-span-9">
        {env.demoMode ? (
          <div className="rounded-lg border border-emerald-700 bg-emerald-900/30 p-2 text-sm">حالت دمو: داده‌ها شبیه‌سازی شده‌اند</div>
        ) : null}
        <MessageList />
        <Composer />
      </main>
    </div>
  );
}
