"use client";

import { Copy, RefreshCcw, Trash2 } from "lucide-react";
import type { ChatMessage } from "@/domain/types/chat";
import { Button } from "@/presentation/components/ui/button";
import { MarkdownView } from "./MarkdownView";
import { ReasoningPanel } from "./ReasoningPanel";
import { ToolCallView } from "./ToolCallView";

export function MessageBubble({ message, onRegenerate }: { message: ChatMessage; onRegenerate?: () => void }) {
  const isUser = message.role === "user";
  return (
    <article className={`rounded-xl border border-zinc-800 p-3 ${isUser ? "bg-zinc-900" : "bg-zinc-950"}`}>
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
        <span>{isUser ? "کاربر" : "دستیار"}</span>
        <time>{new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}</time>
      </div>
      <MarkdownView content={message.content} />
      {message.reasoning ? <ReasoningPanel content={message.reasoning} /> : null}
      {message.toolCalls?.map((tool) => <ToolCallView key={tool.id} payload={tool.payload} />)}
      <div className="mt-2 flex gap-2">
        <Button size="icon" variant="ghost" aria-label="کپی" onClick={() => navigator.clipboard.writeText(message.content)}><Copy className="h-4 w-4" /></Button>
        {!isUser && <Button size="icon" variant="ghost" aria-label="تولید مجدد" onClick={onRegenerate}><RefreshCcw className="h-4 w-4" /></Button>}
        <Button size="icon" variant="ghost" aria-label="حذف"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </article>
  );
}
