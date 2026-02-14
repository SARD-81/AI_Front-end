import { create } from 'zustand';

interface UiState {
  commandPaletteOpen: boolean;
  quoteText?: string;
  setCommandPaletteOpen: (open: boolean) => void;
  setQuoteText: (text?: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setQuoteText: (text) => set({ quoteText: text }),
}));
