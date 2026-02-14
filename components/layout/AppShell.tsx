'use client';

import { Composer } from '@/components/chat/Composer';
import { ChatStartHeader } from '@/components/chat/ChatStartHeader';
import { MessageList } from '@/components/chat/MessageList';
import { ThreadList } from '@/components/chat/ThreadList';
import { CommandPalette } from '@/components/system/CommandPalette';
import { Badge } from '@/components/ui/Badge';
import { ToastHost } from '@/components/ui/Toast';
import { useThreadsStore } from '@/store/useThreadsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useChatStore } from '@/store/useChatStore';
import Link from 'next/link';
import { useEffect } from 'react';

export function AppShell() {
  const settings = useSettingsStore((s) => s.settings);
  const loadSettings = useSettingsStore((s) => s.load);
  const streamState = useChatStore((s) => s.streamState);
  const activeThreadId = useThreadsStore((s) => s.activeThreadId);
  const messagesByThread = useChatStore((s) => s.messagesByThread);

  const threadMessages = activeThreadId ? messagesByThread[activeThreadId] ?? [] : [];
  const showStartHeader = !activeThreadId || threadMessages.length === 0;

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
      <main
        className="col-span-12 flex flex-col gap-3 rounded-2xl border border-slate-700 p-3 lg:col-span-9"
        style={{
          backgroundColor: '#0b0b0f',
          backgroundImage: showStartHeader
            ? 'radial-gradient(circle at 50% 22%, rgba(51, 65, 85, 0.4), rgba(11, 11, 15, 0.96) 54%, rgba(4, 4, 8, 1) 100%)'
            : undefined
        }}
      >
        <header className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/40 p-2 text-xs">
          <Badge>مدل فعال: {settings.activeModel}</Badge>
          <Badge>Context: ۳۲K</Badge>
          <Badge>وضعیت: {settings.demoMode ? 'Demo' : 'Online'}</Badge>
          <Badge>Latency: ~260ms</Badge>
          <Badge>Stream: {streamState}</Badge>
        </header>
        {showStartHeader ? <ChatStartHeader key={activeThreadId ?? 'no-thread'} seedKey={activeThreadId ?? 'no-thread'} /> : null}
        <div className={showStartHeader ? 'hidden' : 'block'}>
          <MessageList />
        </div>
        <Composer />
      </main>
      <CommandPalette />
      <ToastHost />
    </div>
  );
}
