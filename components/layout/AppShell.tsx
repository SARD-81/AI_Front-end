'use client';

import { Composer } from '@/components/chat/Composer';
import { MessageList } from '@/components/chat/MessageList';
import { ThreadList } from '@/components/chat/ThreadList';
import { CommandPalette } from '@/components/system/CommandPalette';
import { Badge } from '@/components/ui/Badge';
import { ToastHost } from '@/components/ui/Toast';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useChatStore } from '@/store/useChatStore';
import Link from 'next/link';
import { useEffect } from 'react';

export function AppShell() {
  const settings = useSettingsStore((s) => s.settings);
  const loadSettings = useSettingsStore((s) => s.load);
  const streamState = useChatStore((s) => s.streamState);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return (
    <div className="grid h-screen grid-cols-12 gap-3 p-3">
      <aside className="col-span-12 rounded-2xl border border-slate-700 bg-slate-900/50 p-3 lg:col-span-3">
        <nav className="mb-3 flex gap-2 text-xs">
          <Link href="/chat">گفتگوها</Link>
          <Link href="/models">مدل‌ها</Link>
          <Link href="/prompts">قالب‌ها</Link>
          <Link href="/settings">تنظیمات</Link>
        </nav>
        <ThreadList />
      </aside>
      <main className="col-span-12 flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/30 p-3 lg:col-span-9">
        <header className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/40 p-2 text-xs">
          <Badge>مدل فعال: {settings.activeModel}</Badge>
          <Badge>Context: ۳۲K</Badge>
          <Badge>وضعیت: {settings.demoMode ? 'Demo' : 'Online'}</Badge>
          <Badge>Latency: ~260ms</Badge>
          <Badge>Stream: {streamState}</Badge>
        </header>
        <MessageList />
        <Composer />
      </main>
      <CommandPalette />
      <ToastHost />
    </div>
  );
}
