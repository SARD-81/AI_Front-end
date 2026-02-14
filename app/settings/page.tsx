'use client';

import { useSettingsStore } from '@/store/useSettingsStore';
import { useTelemetryStore } from '@/store/useTelemetryStore';
import { AppShell } from '@/components/layout/AppShell';
import { useEffect } from 'react';

export default function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const patch = useSettingsStore((s) => s.patch);
  const load = useSettingsStore((s) => s.load);
  const telemetry = useTelemetryStore((s) => s.events);
  const refresh = useTelemetryStore((s) => s.refresh);
  const clear = useTelemetryStore((s) => s.clear);

  useEffect(() => {
    void load();
    refresh();
  }, [load, refresh]);

  return (
    <div className="p-3">
      <AppShell />
      <div className="fixed left-4 top-4 z-20 w-80 rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm">
        <h1 className="mb-2">تنظیمات</h1>
        <label className="mb-2 block">تم
          <select className="w-full rounded bg-slate-800 p-2" value={settings.theme} onChange={(e) => void patch({ theme: e.target.value as 'dark' | 'light' })}>
            <option value="dark">تیره</option>
            <option value="light">روشن</option>
          </select>
        </label>
        <label className="mb-2 block">رنگ تاکیدی
          <select className="w-full rounded bg-slate-800 p-2" value={settings.accent} onChange={(e) => void patch({ accent: e.target.value as 'indigo' | 'emerald' | 'rose' })}>
            <option value="indigo">نیلی</option><option value="emerald">زمردی</option><option value="rose">رز</option>
          </select>
        </label>
        <label className="mb-2 block">سناریوی دمو
          <select className="w-full rounded bg-slate-800 p-2" value={settings.scenario} onChange={(e) => { localStorage.setItem('demo-scenario', e.target.value); void patch({ scenario: e.target.value as never }); }}>
            <option value="normal">Normal</option><option value="rate_limited">Rate-limited</option><option value="auth_expired">Auth expired</option><option value="intermittent_network">Intermittent network</option><option value="heavy_threads">Heavy thread list</option>
          </select>
        </label>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between"><p>Telemetry</p><button onClick={clear}>پاک‌سازی</button></div>
          <div className="max-h-48 overflow-auto rounded bg-black/30 p-2 text-xs">
            {telemetry.map((event) => <p key={`${event.timestamp}-${event.event}`}>{event.event} - {event.timestamp}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}
