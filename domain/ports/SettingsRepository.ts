export interface AppSettings {
  theme: 'dark' | 'light';
  accent: 'indigo' | 'emerald' | 'rose';
  demoMode: boolean;
  activeModel: string;
  scenario: 'normal' | 'rate_limited' | 'auth_expired' | 'intermittent_network' | 'heavy_threads';
}

export interface SettingsRepository {
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
  // TODO(BE): Add settings sync endpoint for cross-device persistence.
}
