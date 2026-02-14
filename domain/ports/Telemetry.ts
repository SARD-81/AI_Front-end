export type TelemetryEventName =
  | 'send_message'
  | 'stream_start'
  | 'stream_done'
  | 'stream_error'
  | 'abort'
  | 'switch_thread';

export interface TelemetryEvent {
  event: TelemetryEventName;
  correlationId?: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export interface Telemetry {
  log(event: TelemetryEvent): void;
  getEvents(): TelemetryEvent[];
  clear(): void;
}
