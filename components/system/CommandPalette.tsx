'use client';

import { Modal } from '@/components/ui/Modal';
import { useUiStore } from '@/store/useUiStore';
import { useThreadsStore } from '@/store/useThreadsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUiStore();
  const createThread = useThreadsStore((s) => s.createThread);
  const patchSettings = useSettingsStore((s) => s.patch);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  return (
    <Modal open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)}>
      <h3 className="mb-3 text-sm text-slate-300">دستورات سریع</h3>
      <div className="space-y-2 text-sm">
        <button className="block w-full rounded bg-slate-800 p-2 text-right" onClick={() => void createThread()}>
          گفتگوی جدید
        </button>
        <button className="block w-full rounded bg-slate-800 p-2 text-right" onClick={() => router.push('/models')}>
          تغییر مدل
        </button>
        <button className="block w-full rounded bg-slate-800 p-2 text-right" onClick={() => void patchSettings({ demoMode: true })}>
          فعال‌سازی حالت دمو
        </button>
        <button className="block w-full rounded bg-slate-800 p-2 text-right" onClick={() => router.push('/settings')}>
          تنظیمات
        </button>
      </div>
    </Modal>
  );
}
