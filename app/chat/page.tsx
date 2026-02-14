"use client";

import { useEffect } from "react";
import { Composer } from "@/presentation/components/chat/Composer";
import { MessageList } from "@/presentation/components/chat/MessageList";
import { EmptyState } from "@/presentation/components/common/EmptyState";
import { ThreadList } from "@/presentation/components/sidebar/ThreadList";
import { SettingsDrawer } from "@/presentation/components/topbar/SettingsDrawer";
import { TopBar } from "@/presentation/components/topbar/TopBar";
import { useChatVM } from "@/presentation/hooks/useChatVM";
import { useThreadsVM } from "@/presentation/hooks/useThreadsVM";
import { useUIStore } from "@/store/ui.store";

export default function ChatPage() {
  const activeThreadId = useUIStore((s) => s.activeThreadId);
  const setActiveThread = useUIStore((s) => s.setActiveThread);
  const toggleDrawer = useUIStore((s) => s.toggleDrawer);
  const toggleSearch = useUIStore((s) => s.toggleSearch);
  const { threadsQuery } = useThreadsVM();
  const chatVM = useChatVM(activeThreadId);

  useEffect(() => {
    if (!activeThreadId && threadsQuery.data?.[0]) setActiveThread(threadsQuery.data[0].id);
  }, [activeThreadId, setActiveThread, threadsQuery.data]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggleSearch(true);
      }
      if (event.key === "Escape") {
        toggleDrawer(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleDrawer, toggleSearch]);

  return (
    <main className="flex h-screen">
      <ThreadList />
      <section className="flex flex-1 flex-col">
        <TopBar />
        {activeThreadId ? (
          <>
            <MessageList messages={chatVM.messages} onRegenerate={chatVM.regenerate} />
            <Composer
              disabled={chatVM.isStreaming}
              onStop={chatVM.stop}
              onSend={(content, files) => chatVM.sendMutation.mutate({ content, attachments: files })}
            />
          </>
        ) : (
          <EmptyState />
        )}
      </section>
      <SettingsDrawer />
    </main>
  );
}
