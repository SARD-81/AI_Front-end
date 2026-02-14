"use client";

import { Download, Settings } from "lucide-react";
import { Button } from "@/presentation/components/ui/button";
import { useUIStore } from "@/store/ui.store";
import { ModelSelector } from "./ModelSelector";

export function TopBar() {
  const settings = useUIStore((s) => s.settings);
  const setMode = useUIStore((s) => s.setMode);
  const toggleDrawer = useUIStore((s) => s.toggleDrawer);

  return (
    <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
      <div className="flex items-center gap-2">
        <ModelSelector />
        {([
          ["chat", "گفتگو"],
          ["reasoning", "استدلال"],
          ["coding", "کدنویسی"],
        ] as const).map(([mode, label]) => (
          <Button key={mode} size="sm" variant={settings.mode === mode ? "default" : "outline"} onClick={() => setMode(mode)}>{label}</Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="خروجی گفتگو" onClick={() => {
          // TODO(BE): add share/save export endpoint if server-side persistence is needed.
        }}><Download className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" aria-label="تنظیمات" onClick={() => toggleDrawer(true)}><Settings className="h-4 w-4" /></Button>
      </div>
    </header>
  );
}
