import type { Telemetry } from "@/domain/ports/Telemetry";

export class ConsoleTelemetry implements Telemetry {
  logEvent(name: string, payload?: Record<string, unknown>): void {
    console.info("[telemetry:event]", name, payload);
  }
  logError(error: unknown, context?: Record<string, unknown>): void {
    console.error("[telemetry:error]", error, context);
    // TODO(BE): send errors to Sentry/NewRelic with proper redaction policy.
  }
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      this.logEvent("measure", { name, durationMs: performance.now() - start });
    }
  }
}
