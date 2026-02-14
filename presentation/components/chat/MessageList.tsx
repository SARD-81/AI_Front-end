"use client";

import type { ChatMessage } from "@/domain/types/chat";
import { MessageBubble } from "./MessageBubble";

export function MessageList({ messages, onRegenerate }: { messages: ChatMessage[]; onRegenerate: () => void }) {
  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} onRegenerate={onRegenerate} />
      ))}
    </div>
  );
}
