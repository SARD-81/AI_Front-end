import { container } from '@/lib/di/container';
import type { Attachment, Message } from '@/domain/types/chat';
import { create } from 'zustand';
import { useThreadsStore } from '@/store/useThreadsStore';
import { useTelemetryStore } from '@/store/useTelemetryStore';

export type StreamSessionState = 'idle' | 'connecting' | 'streaming' | 'stopping' | 'error' | 'done';

interface ChatState {
  messagesByThread: Record<string, Message[]>;
  loadingMessages: boolean;
  streamState: StreamSessionState;
  errorByThread: Record<string, string | undefined>;
  abortController?: AbortController;
  paginationCursorByThread: Record<string, string | undefined>;
  hasMoreByThread: Record<string, boolean>;
  attachments: Attachment[];
  fetchMessages: (threadId: string, reset?: boolean) => Promise<void>;
  sendMessage: (threadId: string, text: string) => Promise<void>;
  startStreamingAnswer: (threadId: string, input: string, retryCount?: number) => Promise<void>;
  stopStreaming: () => void;
  regenerateLast: (threadId: string) => Promise<void>;
  retryLast: (threadId: string) => Promise<void>;
  quoteMessage: (threadId: string, message: Message) => void;
  togglePin: (threadId: string, messageId: string) => void;
  addAttachments: (files: FileList | File[]) => Promise<void>;
  clearAttachments: () => void;
  editLastUserMessageAndRerun: (threadId: string, content: string) => Promise<void>;
}

const createId = () => Math.random().toString(36).slice(2);

export const useChatStore = create<ChatState>((set, get) => ({
  messagesByThread: {},
  loadingMessages: false,
  streamState: 'idle',
  errorByThread: {},
  paginationCursorByThread: {},
  hasMoreByThread: {},
  attachments: [],
  fetchMessages: async (threadId, reset = true) => {
    set({ loadingMessages: true });
    try {
      const cursor = reset ? undefined : get().paginationCursorByThread[threadId];
      const page = await container.chatRepository.getMessages(threadId, cursor);
      set((state) => ({
        loadingMessages: false,
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: reset ? page.items : [...page.items, ...(state.messagesByThread[threadId] ?? [])],
        },
        paginationCursorByThread: { ...state.paginationCursorByThread, [threadId]: page.nextCursor },
        hasMoreByThread: { ...state.hasMoreByThread, [threadId]: Boolean(page.nextCursor) },
      }));
    } catch (error) {
      set((state) => ({
        loadingMessages: false,
        errorByThread: { ...state.errorByThread, [threadId]: (error as Error).message },
      }));
    }
  },
  sendMessage: async (threadId, text) => {
    const correlationId = `corr-${Date.now()}`;
    const userMessage: Message = {
      id: createId(),
      threadId,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
      attachments: get().attachments,
      correlationId,
    };

    useTelemetryStore.getState().log({ event: 'send_message', correlationId, payload: { threadId } });

    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: [...(state.messagesByThread[threadId] ?? []), userMessage],
      },
      attachments: [],
      errorByThread: { ...state.errorByThread, [threadId]: undefined },
    }));

    await get().startStreamingAnswer(threadId, text, 0);
  },
  startStreamingAnswer: async (threadId, input, retryCount = 0) => {
    const assistantId = createId();
    const correlationId = `corr-${Date.now()}`;
    const start = performance.now();
    let firstTokenAt = 0;

    const placeholder: Message = {
      id: assistantId,
      threadId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      correlationId,
      status: 'ok',
    };
    const abortController = new AbortController();

    useThreadsStore.getState().markThreadStreaming(threadId, true);
    useTelemetryStore.getState().log({ event: 'stream_start', correlationId, payload: { threadId, retryCount } });

    set((state) => ({
      abortController,
      streamState: 'connecting',
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: [...(state.messagesByThread[threadId] ?? []), placeholder],
      },
    }));

    await container.streamTransport.streamChat(
      {
        threadId,
        input,
        // TODO(BE): confirm streaming payload fields (model, parentId, tools, token limits).
      },
      {
        signal: abortController.signal,
        onDelta: (delta) => {
          if (!firstTokenAt) firstTokenAt = performance.now();
          set((state) => ({
            streamState: 'streaming',
            messagesByThread: {
              ...state.messagesByThread,
              [threadId]: (state.messagesByThread[threadId] ?? []).map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      content: message.content + delta,
                      metrics: {
                        ...message.metrics,
                        ttftMs: Math.round(firstTokenAt - start),
                      },
                    }
                  : message,
              ),
            },
          }));
        },
        onDone: () => {
          const doneAt = performance.now();
          useTelemetryStore.getState().log({ event: 'stream_done', correlationId, payload: { totalMs: doneAt - start } });
          useThreadsStore.getState().markThreadStreaming(threadId, false);
          set((state) => ({
            streamState: 'done',
            abortController: undefined,
            messagesByThread: {
              ...state.messagesByThread,
              [threadId]: (state.messagesByThread[threadId] ?? []).map((message) =>
                message.id === assistantId
                  ? { ...message, metrics: { ...message.metrics, latencyMs: Math.round(doneAt - start) } }
                  : message,
              ),
            },
          }));
        },
        onError: async (error) => {
          const transient = /429|500|network|TIMEOUT/i.test(error.message);
          if (transient && retryCount < 2) {
            const wait = 350 * 2 ** retryCount;
            await new Promise((resolve) => setTimeout(resolve, wait));
            await get().startStreamingAnswer(threadId, input, retryCount + 1);
            return;
          }
          useTelemetryStore.getState().log({ event: 'stream_error', correlationId, payload: { message: error.message } });
          useThreadsStore.getState().markThreadStreaming(threadId, false);
          set((state) => ({
            streamState: 'error',
            abortController: undefined,
            errorByThread: { ...state.errorByThread, [threadId]: error.message },
            messagesByThread: {
              ...state.messagesByThread,
              [threadId]: (state.messagesByThread[threadId] ?? []).map((message) =>
                message.id === assistantId ? { ...message, error: error.message, status: 'error' } : message,
              ),
            },
          }));
        },
      },
    );
  },
  stopStreaming: () => {
    const controller = get().abortController;
    if (controller) {
      controller.abort();
      useTelemetryStore.getState().log({ event: 'abort' });
    }
    set((state) => ({
      streamState: 'stopping',
      abortController: undefined,
      messagesByThread: Object.fromEntries(
        Object.entries(state.messagesByThread).map(([threadId, messages]) => [
          threadId,
          messages.map((m, idx) => (idx === messages.length - 1 && m.role === 'assistant' ? { ...m, status: 'stopped', content: `${m.content}\n\nمتوقف شد.` } : m)),
        ]),
      ),
    }));
  },
  regenerateLast: async (threadId) => {
    const threadMessages = get().messagesByThread[threadId] ?? [];
    const lastUser = [...threadMessages].reverse().find((message) => message.role === 'user');
    if (!lastUser) return;
    // TODO(BE): confirm regenerate contract (parent message ids + transcript policy).
    await get().startStreamingAnswer(threadId, lastUser.content);
  },
  retryLast: async (threadId) => {
    const threadMessages = get().messagesByThread[threadId] ?? [];
    const lastUser = [...threadMessages].reverse().find((message) => message.role === 'user');
    if (!lastUser) return;
    await get().startStreamingAnswer(threadId, lastUser.content);
  },
  quoteMessage: (threadId, message) => {
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: state.messagesByThread[threadId] ?? [],
      },
    }));
  },
  togglePin: (threadId, messageId) => {
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: (state.messagesByThread[threadId] ?? []).map((message) =>
          message.id === messageId ? { ...message, pinned: !message.pinned } : message,
        ),
      },
    }));
  },
  addAttachments: async (files) => {
    const fileArray = Array.from(files);
    const uploaded = await Promise.all(fileArray.map((file) => container.uploadRepository.upload(file)));
    set((state) => ({ attachments: [...state.attachments, ...uploaded] }));
  },
  clearAttachments: () => set({ attachments: [] }),
  editLastUserMessageAndRerun: async (threadId, content) => {
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: (state.messagesByThread[threadId] ?? []).map((message, idx, arr) => {
          const isLastUser = message.role === 'user' && idx === arr.map((m) => m.role).lastIndexOf('user');
          return isLastUser ? { ...message, content } : message;
        }),
      },
    }));
    await get().startStreamingAnswer(threadId, content);
  },
}));
