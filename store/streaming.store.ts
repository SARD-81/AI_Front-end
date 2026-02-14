import { create } from "zustand";

interface StreamingState {
  isStreaming: boolean;
  abortController: AbortController | null;
  setStreaming: (value: boolean) => void;
  setAbortController: (controller: AbortController | null) => void;
}

export const useStreamingStore = create<StreamingState>((set) => ({
  isStreaming: false,
  abortController: null,
  setStreaming: (value) => set({ isStreaming: value }),
  setAbortController: (abortController) => set({ abortController }),
}));
