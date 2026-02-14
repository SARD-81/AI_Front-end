import { container } from '@/lib/di/container';
import type { Thread } from '@/domain/types/chat';
import { create } from 'zustand';

interface ThreadsState {
  threads: Thread[];
  activeThreadId?: string;
  loading: boolean;
  error?: string;
  fetchThreads: (query?: string) => Promise<void>;
  createThread: () => Promise<void>;
  renameThread: (threadId: string, title: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  setActiveThread: (threadId?: string) => void;
}

export const useThreadsStore = create<ThreadsState>((set, get) => ({
  threads: [],
  loading: false,
  fetchThreads: async (query) => {
    set({ loading: true, error: undefined });
    try {
      const threads = await container.chatRepository.getThreads(query);
      set({ threads, loading: false, activeThreadId: get().activeThreadId ?? threads[0]?.id });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },
  createThread: async () => {
    const thread = await container.chatRepository.createThread();
    set((state) => ({ threads: [thread, ...state.threads], activeThreadId: thread.id }));
  },
  renameThread: async (threadId, title) => {
    const updated = await container.chatRepository.renameThread(threadId, title);
    set((state) => ({
      threads: state.threads.map((item) => (item.id === threadId ? updated : item)),
    }));
  },
  deleteThread: async (threadId) => {
    await container.chatRepository.deleteThread(threadId);
    set((state) => {
      const threads = state.threads.filter((item) => item.id !== threadId);
      return {
        threads,
        activeThreadId: state.activeThreadId === threadId ? threads[0]?.id : state.activeThreadId,
      };
    });
  },
  setActiveThread: (threadId) => set({ activeThreadId: threadId }),
}));
