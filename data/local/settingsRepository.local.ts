import type { AppSettings, SettingsRepository } from '@/domain/ports/SettingsRepository';

const KEY = 'ai-chat-settings-v2';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accent: 'indigo',
  demoMode: true,
  activeModel: 'deepseek-lite-demo',
  scenario: 'normal',
};

export class LocalSettingsRepository implements SettingsRepository {
  async getSettings(): Promise<AppSettings> {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(settings));
  }
}
