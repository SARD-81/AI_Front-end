import { container } from '@/lib/di/container';
import type { Thread } from '@/domain/types/chat';
import { create } from 'zustand';
import { useTelemetryStore } from '@/store/useTelemetryStore';

interface ThreadsState {
  threads: Thread[];
  activeThreadId?: string;
  loading: boolean;
  error?: string;
  tagFilter?: string;
  fetchThreads: (query?: string) => Promise<void>;
  createThread: () => Promise<void>;
  renameThread: (threadId: string, title: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  setActiveThread: (threadId?: string) => void;
  setTagFilter: (tag?: string) => void;
  markThreadStreaming: (threadId: string, isStreaming: boolean) => void;
}

export const useThreadsStore = create<ThreadsState>((set, get) => ({
  threads: [],
  loading: false,
  fetchThreads: async (query) => {
    set({ loading: true, error: undefined });
    try {
      const threads = await container.chatRepository.getThreads(query);
      const tagFilter = get().tagFilter;
      const filtered = tagFilter ? threads.filter((thread) => thread.tags?.includes(tagFilter)) : threads;
      set({ threads: filtered, loading: false, activeThreadId: get().activeThreadId ?? filtered[0]?.id });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },
  createThread: async () => {
    const optimistic: Thread = {
      id: `optimistic-${Date.now()}`,
      title: 'گفتگوی جدید',
      updatedAt: new Date().toISOString(),
      preview: 'در حال ایجاد...',
      tags: ['کار'],
    };
    set((state) => ({ threads: [optimistic, ...state.threads], activeThreadId: optimistic.id }));
    const thread = await container.chatRepository.createThread();
    set((state) => ({
      threads: state.threads.map((item) => (item.id === optimistic.id ? thread : item)),
      activeThreadId: thread.id,
    }));
  },
  renameThread: async (threadId, title) => {
    const updated = await container.chatRepository.renameThread(threadId, title);
    set((state) => ({
      threads: state.threads.map((item) => (item.id === threadId ? updated : item)),
    }));
  },
  deleteThread: async (threadId) => {
    const prev = get().threads;
    set((state) => ({ threads: state.threads.filter((item) => item.id !== threadId) }));
    try {
      await container.chatRepository.deleteThread(threadId);
    } catch {
      set({ threads: prev });
    }
    set((state) => {
      const threads = state.threads;
      return {
        activeThreadId: state.activeThreadId === threadId ? threads[0]?.id : state.activeThreadId,
      };
    });
  },
  setActiveThread: (threadId) => {
    useTelemetryStore.getState().log({ event: 'switch_thread', payload: { threadId } });
    set({ activeThreadId: threadId });
  },
  setTagFilter: (tagFilter) => set({ tagFilter }),
  markThreadStreaming: (threadId, isStreaming) =>
    set((state) => ({
      threads: state.threads.map((thread) => (thread.id === threadId ? { ...thread, isStreaming } : thread)),
    })),
}));
