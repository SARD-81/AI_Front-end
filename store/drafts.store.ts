import { create } from "zustand";
import { container } from "@/infrastructure/di/container";

interface DraftState {
  drafts: Record<string, string>;
  setDraft: (threadId: string, value: string) => void;
}

export const useDraftsStore = create<DraftState>((set) => ({
  drafts: {},
  setDraft: (threadId, value) => {
    container.settingsStore.setDraft(threadId, value);
    set((state) => ({ drafts: { ...state.drafts, [threadId]: value } }));
  },
}));
