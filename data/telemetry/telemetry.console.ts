import type { Telemetry, TelemetryEvent } from '@/domain/ports/Telemetry';

export class ConsoleTelemetry implements Telemetry {
  private events: TelemetryEvent[] = [];

  log(event: TelemetryEvent): void {
    this.events = [event, ...this.events].slice(0, 200);
    // eslint-disable-next-line no-console
    console.log('[telemetry]', event);
  }

  getEvents(): TelemetryEvent[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
  }
}
