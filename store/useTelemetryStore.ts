import { container } from '@/lib/di/container';
import type { TelemetryEvent } from '@/domain/ports/Telemetry';
import { create } from 'zustand';

interface TelemetryState {
  events: TelemetryEvent[];
  log: (event: Omit<TelemetryEvent, 'timestamp'>) => void;
  clear: () => void;
  refresh: () => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  events: [],
  log: (event) => {
    container.telemetry.log({ ...event, timestamp: new Date().toISOString() });
    set({ events: container.telemetry.getEvents() });
  },
  clear: () => {
    container.telemetry.clear();
    set({ events: [] });
  },
  refresh: () => set({ events: container.telemetry.getEvents() }),
}));
