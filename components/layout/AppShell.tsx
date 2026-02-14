'use client';

import { Composer } from '@/components/chat/Composer';
import { ChatStartHeader } from '@/components/chat/ChatStartHeader';
import { MessageList } from '@/components/chat/MessageList';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarRail } from '@/components/layout/SidebarRail';
import { CommandPalette } from '@/components/system/CommandPalette';
import { Badge } from '@/components/ui/Badge';
import { ToastHost } from '@/components/ui/Toast';
import { useChatStore } from '@/store/useChatStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useThreadsStore } from '@/store/useThreadsStore';
import { useUiStore } from '@/store/useUiStore';
import { useEffect } from 'react';

export function AppShell() {
  const settings = useSettingsStore((s) => s.settings);
  const loadSettings = useSettingsStore((s) => s.load);
  const streamState = useChatStore((s) => s.streamState);
  const activeThreadId = useThreadsStore((s) => s.activeThreadId);
  const messagesByThread = useChatStore((s) => s.messagesByThread);
  const isSidebarCollapsed = useUiStore((s) => s.isSidebarCollapsed);

  const threadMessages = activeThreadId ? messagesByThread[activeThreadId] ?? [] : [];
  const showStartHeader = !activeThreadId || threadMessages.length === 0;

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return (
    <div className="flex h-screen gap-3 p-3">
      <div className="shrink-0 transition-[width] duration-200 ease-out" style={{ width: isSidebarCollapsed ? '72px' : '300px' }}>
        {isSidebarCollapsed ? <SidebarRail /> : <Sidebar />}
      </div>
      <main
        className="flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-slate-700 p-3"
        style={{
          backgroundColor: '#0b0b0f',
          backgroundImage: showStartHeader
            ? 'radial-gradient(circle at 50% 22%, rgba(51, 65, 85, 0.4), rgba(11, 11, 15, 0.96) 54%, rgba(4, 4, 8, 1) 100%)'
            : undefined,
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
