import { create } from "zustand";
import type { ChatMode, ChatSettings } from "@/domain/types/chat";
import { container } from "@/infrastructure/di/container";

interface UIState {
  activeThreadId: string | null;
  settingsDrawerOpen: boolean;
  searchOpen: boolean;
  settings: ChatSettings;
  setActiveThread: (id: string) => void;
  setMode: (mode: ChatMode) => void;
  setSettings: (partial: Partial<ChatSettings>) => void;
  toggleDrawer: (value?: boolean) => void;
  toggleSearch: (value?: boolean) => void;
}

const initialSettings = container.settingsStore.getSettings();

export const useUIStore = create<UIState>((set, get) => ({
  activeThreadId: null,
  settingsDrawerOpen: false,
  searchOpen: false,
  settings: initialSettings,
  setActiveThread: (id) => set({ activeThreadId: id }),
  setMode: (mode) => {
    const next = { ...get().settings, mode };
    container.settingsStore.setSettings(next);
    set({ settings: next });
  },
  setSettings: (partial) => {
    const next = { ...get().settings, ...partial };
    container.settingsStore.setSettings(next);
    set({ settings: next });
  },
  toggleDrawer: (value) => set((s) => ({ settingsDrawerOpen: value ?? !s.settingsDrawerOpen })),
  toggleSearch: (value) => set((s) => ({ searchOpen: value ?? !s.searchOpen })),
}));
