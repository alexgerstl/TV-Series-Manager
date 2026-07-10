import type { LogsRepository } from '../database/repositories/LogsRepository';
import type { LogLevel } from '../models/LogEntry';

import type { IConsoleSink } from './IConsoleSink';
import type { ILoggingService, LogContext } from './ILoggingService';
import { redact } from './redact';

/**
 * Writes structured log entries to the `Logs` table (via `LogsRepository`)
 * and a console sink (architecture.md §1.2/§3.1). Every entry's message is
 * redacted per §6 before it reaches either sink — see `redact.ts`.
 */
export class LoggingService implements ILoggingService {
  constructor(
    private readonly repository: LogsRepository,
    private readonly consoleSink: IConsoleSink,
  ) {}

  debug(source: string, message: string, context?: LogContext): void {
    this.write('debug', source, message, undefined, context);
  }

  info(source: string, message: string, context?: LogContext): void {
    this.write('info', source, message, undefined, context);
  }

  warn(source: string, message: string, context?: LogContext): void {
    this.write('warn', source, message, undefined, context);
  }

  error(source: string, message: string, error?: unknown, context?: LogContext): void {
    this.write('error', source, message, error, context);
  }

  private write(
    level: LogLevel,
    source: string,
    message: string,
    error: unknown,
    context: LogContext | undefined,
  ): void {
    const fullMessage = appendContext(message, context);
    const exception = error === undefined ? undefined : formatException(error);

    this.repository.create({
      level,
      source,
      message: fullMessage,
      ...(exception !== undefined ? { exception } : {}),
    });
    this.consoleSink[level](`[${source}] ${fullMessage}`);
  }
}

function appendContext(message: string, context: LogContext | undefined): string {
  if (!context || Object.keys(context).length === 0) {
    return message;
  }
  return `${message} ${safeStringify(redact(context))}`;
}

function formatException(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable context]';
  }
}
