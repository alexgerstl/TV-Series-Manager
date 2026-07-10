/**
 * Minimal console-sink contract `LoggingService` writes to (architecture.md
 * §3.1: "logging/ # LoggingService (Pino + DB sink)"). Kept narrow — rather
 * than depending on pino's `Logger` type directly — so tests can inject a
 * fake without spinning up a real pino instance, mirroring the
 * `ISafeStorage` pattern from M1.5.
 */
export interface IConsoleSink {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
