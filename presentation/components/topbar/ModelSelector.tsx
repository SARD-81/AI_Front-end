"use client";

import { useUIStore } from "@/store/ui.store";

const models = ["DeepSeek Chat", "DeepSeek Reasoner", "Coder"];

export function ModelSelector() {
  const settings = useUIStore((s) => s.settings);
  const setSettings = useUIStore((s) => s.setSettings);

  return (
    <select
      className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
      value={settings.model}
      onChange={(e) => setSettings({ model: e.target.value })}
      aria-label="مدل"
    >
      {models.map((model) => (
        <option key={model} value={model}>{model}</option>
      ))}
    </select>
  );
}
