/**
 * Structured metadata attached to a log call. Any key whose name contains
 * `password` or `credential` (case-insensitive, checked recursively) is
 * redacted before the entry is persisted or written to the console sink —
 * architecture.md §6: "LoggingService has an explicit redaction rule for
 * any field named password/credential."
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * Structured logging to the `Logs` table + console sink (architecture.md
 * §1.2 Major Components). One method per level, mirroring both the `Logs`
 * table's `level` column values and pino's level methods.
 */
export interface ILoggingService {
  debug(source: string, message: string, context?: LogContext): void;
  info(source: string, message: string, context?: LogContext): void;
  warn(source: string, message: string, context?: LogContext): void;
  /** `error` carries the causing error/exception separately from `context`. */
  error(source: string, message: string, error?: unknown, context?: LogContext): void;
}
