"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ChatMessage, StreamEvent } from "@/domain/types/chat";
import { container } from "@/infrastructure/di/container";
import { useStreamingStore } from "@/store/streaming.store";
import { useUIStore } from "@/store/ui.store";

export function useChatVM(threadId: string | null) {
  const queryClient = useQueryClient();
  const [streamed, setStreamed] = useState<ChatMessage | null>(null);
  const settings = useUIStore((s) => s.settings);
  const { abortController, setAbortController, setStreaming, isStreaming } = useStreamingStore();

  const messagesQuery = useQuery({
    queryKey: ["messages", threadId],
    enabled: !!threadId,
    queryFn: () => container.usecases.getMessages.execute(threadId!),
  });

  const sendMutation = useMutation({
    mutationFn: async ({ content, attachments }: { content: string; attachments: File[] }) => {
      if (!threadId) return;
      const controller = new AbortController();
      setAbortController(controller);
      setStreaming(true);
      setStreamed({ id: "streaming", threadId, role: "assistant", content: "", reasoning: "", createdAt: new Date().toISOString() });

      await container.usecases.sendMessageAndStream.execute({
        threadId,
        content,
        settings,
        attachments,
        signal: controller.signal,
        onEvent: (event: StreamEvent) => {
          if (event.type === "delta") {
            setStreamed((prev) =>
              prev
                ? {
                    ...prev,
                    content: `${prev.content}${event.content ?? ""}`,
                    reasoning: `${prev.reasoning ?? ""}${event.reasoning ?? ""}`,
                  }
                : prev,
            );
          }
          if (event.type === "tool") {
            setStreamed((prev) => (prev ? { ...prev, toolCalls: [{ id: crypto.randomUUID(), name: "tool", payload: event.payload }] } : prev));
          }
          if (event.type === "error") {
            toast.error(`خطا: ${event.error.message}`);
          }
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
    },
    onError: () => toast.error("ارسال پیام ناموفق بود"),
    onSettled: () => {
      setStreaming(false);
      setAbortController(null);
    },
  });

  const stop = () => container.usecases.stopStreaming.execute(abortController);

  const regenerate = async () => {
    if (!threadId || !messagesQuery.data) return;
    const controller = new AbortController();
    setAbortController(controller);
    setStreaming(true);
    setStreamed({ id: "regen", threadId, role: "assistant", content: "", createdAt: new Date().toISOString(), reasoning: "" });
    await container.usecases.regenerateLast.execute({
      threadId,
      messages: messagesQuery.data,
      settings,
      signal: controller.signal,
      onEvent: (event) => {
        if (event.type === "delta") {
          setStreamed((prev) => (prev ? { ...prev, content: `${prev.content}${event.content ?? ""}`, reasoning: `${prev.reasoning ?? ""}${event.reasoning ?? ""}` } : prev));
        }
      },
    });
    setStreaming(false);
  };

  const mergedMessages = useMemo(() => {
    const base = messagesQuery.data ?? [];
    return streamed ? [...base, streamed] : base;
  }, [messagesQuery.data, streamed]);

  return { messagesQuery, messages: mergedMessages, isStreaming, sendMutation, stop, regenerate };
}
