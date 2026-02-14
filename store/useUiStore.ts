import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  commandPaletteOpen: boolean;
  quoteText?: string;
  isSidebarCollapsed: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  setQuoteText: (text?: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      commandPaletteOpen: false,
      quoteText: undefined,
      isSidebarCollapsed: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setQuoteText: (text) => set({ quoteText: text }),
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (value) => set({ isSidebarCollapsed: value }),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
    }
  )
);
