"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { container } from "@/infrastructure/di/container";

export function useThreadsVM() {
  const queryClient = useQueryClient();

  const threadsQuery = useQuery({
    queryKey: ["threads"],
    queryFn: () => container.usecases.listThreads.execute(),
    select: (data) => data.items,
  });

  const createThread = useMutation({
    mutationFn: (title?: string) => container.usecases.createThread.execute(title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["threads"] }),
  });

  const renameThread = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => container.usecases.renameThread.execute(id, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["threads"] }),
  });

  const deleteThread = useMutation({
    mutationFn: (id: string) => container.usecases.deleteThread.execute(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["threads"] }),
  });

  return { threadsQuery, createThread, renameThread, deleteThread };
}
