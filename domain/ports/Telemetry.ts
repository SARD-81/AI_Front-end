export interface Telemetry {
  logEvent(name: string, payload?: Record<string, unknown>): void;
  logError(error: unknown, context?: Record<string, unknown>): void;
  measure<T>(name: string, fn: () => Promise<T>): Promise<T>;
}
