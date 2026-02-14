import { container } from '@/lib/di/container';
import type { AppSettings } from '@/domain/ports/SettingsRepository';
import { create } from 'zustand';

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  patch: (next: Partial<AppSettings>) => Promise<void>;
}

const defaults: AppSettings = {
  theme: 'dark',
  accent: 'indigo',
  demoMode: true,
  activeModel: 'deepseek-lite-demo',
  scenario: 'normal',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaults,
  loaded: false,
  load: async () => {
    const settings = await container.settingsRepository.getSettings();
    set({ settings, loaded: true });
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.accent = settings.accent;
  },
  patch: async (next) => {
    const settings = { ...get().settings, ...next };
    set({ settings });
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.accent = settings.accent;
    await container.settingsRepository.saveSettings(settings);
  },
}));
