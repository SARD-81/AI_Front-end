"use client";

import { MoreHorizontal, Pin, Trash2 } from "lucide-react";
import type { ChatThread } from "@/domain/types/chat";
import { Button } from "@/presentation/components/ui/button";

export function ThreadRow({
  thread,
  active,
  onSelect,
  onDelete,
  onPin,
}: {
  thread: ChatThread;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  return (
    <div className={`group flex items-center gap-1 rounded-md px-2 py-2 ${active ? "bg-zinc-800" : "hover:bg-zinc-900"}`}>
      <button className="flex-1 truncate text-right text-sm" onClick={onSelect} aria-label={`باز کردن ${thread.title}`}>
        {thread.title}
      </button>
      <Button size="icon" variant="ghost" onClick={onPin} aria-label="سنجاق">
        <Pin className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" onClick={onDelete} aria-label="حذف">
        <Trash2 className="h-4 w-4" />
      </Button>
      <MoreHorizontal className="h-4 w-4 text-zinc-500" />
    </div>
  );
}
