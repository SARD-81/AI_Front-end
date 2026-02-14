import { container } from '@/lib/di/container';
import type { Message } from '@/domain/types/chat';
import { create } from 'zustand';

interface ChatState {
  messagesByThread: Record<string, Message[]>;
  loadingMessages: boolean;
  streaming: boolean;
  errorByThread: Record<string, string | undefined>;
  abortController?: AbortController;
  fetchMessages: (threadId: string) => Promise<void>;
  sendMessage: (threadId: string, text: string) => Promise<void>;
  startStreamingAnswer: (threadId: string, input: string) => Promise<void>;
  stopStreaming: () => void;
  regenerateLast: (threadId: string) => Promise<void>;
  retryLast: (threadId: string) => Promise<void>;
}

const createId = () => Math.random().toString(36).slice(2);

export const useChatStore = create<ChatState>((set, get) => ({
  messagesByThread: {},
  loadingMessages: false,
  streaming: false,
  errorByThread: {},
  fetchMessages: async (threadId) => {
    set({ loadingMessages: true });
    try {
      const messages = await container.chatRepository.getMessages(threadId);
      set((state) => ({
        loadingMessages: false,
        messagesByThread: { ...state.messagesByThread, [threadId]: messages },
      }));
    } catch (error) {
      set((state) => ({
        loadingMessages: false,
        errorByThread: {
          ...state.errorByThread,
          [threadId]: (error as Error).message,
        },
      }));
    }
  },
  sendMessage: async (threadId, text) => {
    const userMessage: Message = {
      id: createId(),
      threadId,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: [...(state.messagesByThread[threadId] ?? []), userMessage],
      },
      errorByThread: { ...state.errorByThread, [threadId]: undefined },
    }));

    await get().startStreamingAnswer(threadId, text);
  },
  startStreamingAnswer: async (threadId, input) => {
    const assistantId = createId();
    const placeholder: Message = {
      id: assistantId,
      threadId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    const abortController = new AbortController();

    set((state) => ({
      abortController,
      streaming: true,
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: [...(state.messagesByThread[threadId] ?? []), placeholder],
      },
    }));

    await container.streamTransport.streamChat(
      {
        threadId,
        input,
        // TODO(BE): Add model/system/tool settings based on backend contract.
      },
      {
        signal: abortController.signal,
        onDelta: (delta) => {
          set((state) => ({
            messagesByThread: {
              ...state.messagesByThread,
              [threadId]: (state.messagesByThread[threadId] ?? []).map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      content: message.content + delta,
                    }
                  : message,
              ),
            },
          }));
        },
        onDone: () => set({ streaming: false, abortController: undefined }),
        onError: (error) =>
          set((state) => ({
            streaming: false,
            abortController: undefined,
            errorByThread: { ...state.errorByThread, [threadId]: error.message },
          })),
      },
    );
  },
  stopStreaming: () => {
    const controller = get().abortController;
    if (controller) {
      controller.abort();
    }
    set({ streaming: false, abortController: undefined });
  },
  regenerateLast: async (threadId) => {
    const threadMessages = get().messagesByThread[threadId] ?? [];
    const lastUser = [...threadMessages].reverse().find((message) => message.role === 'user');
    if (!lastUser) return;
    // TODO(BE): Confirm regenerate payload rules (message id, parent id, full transcript, etc.).
    await get().startStreamingAnswer(threadId, lastUser.content);
  },
  retryLast: async (threadId) => {
    const threadMessages = get().messagesByThread[threadId] ?? [];
    const lastUser = [...threadMessages].reverse().find((message) => message.role === 'user');
    if (!lastUser) return;
    await get().startStreamingAnswer(threadId, lastUser.content);
  },
}));
