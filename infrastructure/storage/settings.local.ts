import type { SettingsStore } from "@/domain/ports/SettingsStore";
import type { ChatSettings } from "@/domain/types/chat";

const SETTINGS_KEY = "ai-chat-settings";
const PINS_KEY = "ai-chat-pins";
const DRAFT_KEY = "ai-chat-drafts";

const defaults: ChatSettings = {
  model: "DeepSeek Chat",
  mode: "chat",
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 1024,
  systemPrompt: "",
  showReasoning: true,
  streaming: true,
  autoSave: true,
  multiSend: false,
  theme: "dark",
};

export class LocalSettingsStore implements SettingsStore {
  getSettings(): ChatSettings {
    if (typeof window === "undefined") return defaults;
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  }
  setSettings(settings: ChatSettings): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
  getPinnedThreadIds(): string[] {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(PINS_KEY);
    return raw ? JSON.parse(raw) : [];
  }
  setPinnedThreadIds(ids: string[]): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PINS_KEY, JSON.stringify(ids));
  }
  getDraft(threadId: string): string {
    if (typeof window === "undefined") return "";
    const raw = window.localStorage.getItem(DRAFT_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return map[threadId] ?? "";
  }
  setDraft(threadId: string, value: string): void {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(DRAFT_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[threadId] = value;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(map));
  }
}
