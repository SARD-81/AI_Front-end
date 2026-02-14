"use client";

import { useUIStore } from "@/store/ui.store";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";

export function SettingsDrawer() {
  const open = useUIStore((s) => s.settingsDrawerOpen);
  const toggle = useUIStore((s) => s.toggleDrawer);
  const settings = useUIStore((s) => s.settings);
  const setSettings = useUIStore((s) => s.setSettings);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={() => toggle(false)}>
      <aside className="absolute left-0 top-0 h-full w-full max-w-md bg-zinc-900 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">تنظیمات</h3>
          <Button variant="ghost" onClick={() => toggle(false)}>بستن</Button>
        </div>
        <label className="text-sm">temperature</label>
        <Input type="number" step="0.1" value={settings.temperature} onChange={(e) => setSettings({ temperature: Number(e.target.value) })} />
        <label className="mt-3 block text-sm">top_p</label>
        <Input type="number" step="0.1" value={settings.topP} onChange={(e) => setSettings({ topP: Number(e.target.value) })} />
        <label className="mt-3 block text-sm">max_tokens</label>
        <Input type="number" value={settings.maxTokens} onChange={(e) => setSettings({ maxTokens: Number(e.target.value) })} />
        <label className="mt-3 block text-sm">system prompt</label>
        <textarea className="h-28 w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" value={settings.systemPrompt} onChange={(e) => setSettings({ systemPrompt: e.target.value })} />
        <div className="mt-4 space-y-2 text-sm">
          <label className="flex items-center justify-between"><span>نمایش تحلیل</span><input type="checkbox" checked={settings.showReasoning} onChange={(e) => setSettings({ showReasoning: e.target.checked })} /></label>
          <label className="flex items-center justify-between"><span>پخش زنده</span><input type="checkbox" checked={settings.streaming} onChange={(e) => setSettings({ streaming: e.target.checked })} /></label>
          <label className="flex items-center justify-between"><span>ذخیره خودکار</span><input type="checkbox" checked={settings.autoSave} onChange={(e) => setSettings({ autoSave: e.target.checked })} /></label>
          <label className="flex items-center justify-between"><span>چندارسالی</span><input type="checkbox" checked={settings.multiSend} onChange={(e) => setSettings({ multiSend: e.target.checked })} /></label>
        </div>
        <p className="mt-4 text-xs text-emerald-400">{process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? "Demo Mode" : "Connected"}</p>
      </aside>
    </div>
  );
}
