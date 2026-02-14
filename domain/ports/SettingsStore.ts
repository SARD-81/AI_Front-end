import type { ChatSettings } from "@/domain/types/chat";

export interface SettingsStore {
  getSettings(): ChatSettings;
  setSettings(settings: ChatSettings): void;
  getPinnedThreadIds(): string[];
  setPinnedThreadIds(ids: string[]): void;
  getDraft(threadId: string): string;
  setDraft(threadId: string, value: string): void;
}
