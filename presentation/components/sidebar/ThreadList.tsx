"use client";

import { useMemo } from "react";
import { isThisWeek, isToday } from "date-fns";
import { useThreadsVM } from "@/presentation/hooks/useThreadsVM";
import { useUIStore } from "@/store/ui.store";
import { Input } from "@/presentation/components/ui/input";
import { Button } from "@/presentation/components/ui/button";
import { ThreadRow } from "./ThreadRow";

export function ThreadList() {
  const { threadsQuery, createThread, deleteThread } = useThreadsVM();
  const activeThreadId = useUIStore((s) => s.activeThreadId);
  const setActiveThread = useUIStore((s) => s.setActiveThread);

  const grouped = useMemo(() => {
    const threads = threadsQuery.data ?? [];
    return {
      today: threads.filter((t) => isToday(new Date(t.updatedAt))),
      week: threads.filter((t) => !isToday(new Date(t.updatedAt)) && isThisWeek(new Date(t.updatedAt))),
      older: threads.filter((t) => !isThisWeek(new Date(t.updatedAt))),
    };
  }, [threadsQuery.data]);

  return (
    <aside className="w-full border-l border-zinc-800 bg-zinc-950 p-3 md:w-80">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">دستیار سازمانی</h2>
        <Button size="sm" onClick={() => createThread.mutate("گفتگوی جدید")}>گفتگوی جدید</Button>
      </div>
      <Input placeholder="جستجوی گفتگو..." aria-label="جستجو" />
      {([
        ["امروز", grouped.today],
        ["این هفته", grouped.week],
        ["قدیمی‌تر", grouped.older],
      ] as const).map(([title, items]) => (
        <section key={title} className="mt-4">
          <h3 className="mb-2 text-xs text-zinc-400">{title}</h3>
          <div className="space-y-1">
            {items.map((thread) => (
              <ThreadRow
                key={thread.id}
                thread={thread}
                active={thread.id === activeThreadId}
                onSelect={() => setActiveThread(thread.id)}
                onDelete={() => deleteThread.mutate(thread.id)}
                onPin={() => {
                  // TODO(BE): persist pin state in backend profile/thread metadata.
                }}
              />
            ))}
          </div>
        </section>
      ))}
    </aside>
  );
}
