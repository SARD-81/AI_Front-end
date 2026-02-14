'use client';

import { create } from 'zustand';

interface ToastState { message?: string; show: (msg: string) => void; clear: () => void }
export const useToastStore = create<ToastState>((set) => ({
  message: undefined,
  show: (message) => {
    set({ message });
    setTimeout(() => set({ message: undefined }), 1400);
  },
  clear: () => set({ message: undefined }),
}));

export function ToastHost() {
  const message = useToastStore((s) => s.message);
  if (!message) return null;
  return <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-950">{message}</div>;
}
