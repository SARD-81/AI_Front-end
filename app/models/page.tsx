'use client';

import { AppShell } from '@/components/layout/AppShell';
import { container } from '@/lib/di/container';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { ModelInfo } from '@/domain/types/chat';
import { useEffect, useState } from 'react';

export default function ModelsPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const patch = useSettingsStore((s) => s.patch);

  useEffect(() => {
    if (container.chatRepository.getModels) {
      void container.chatRepository.getModels().then(setModels);
    }
  }, []);

  return (
    <div className="p-3">
      <AppShell />
      <div className="fixed left-4 top-4 z-20 w-80 rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm">
        <h1 className="mb-2">مدل‌ها (دمو)</h1>
        <p className="mb-2 text-xs text-slate-400">TODO(BE): models list endpoint and token usage fields.</p>
        <div className="space-y-2">
          {models.map((model) => (
            <button key={model.id} className="block w-full rounded border border-slate-700 p-2 text-right" onClick={() => void patch({ activeModel: model.id })}>
              <p>{model.name}</p>
              <p className="text-xs text-slate-400">{model.contextWindow.toLocaleString('fa-IR')} توکن</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
