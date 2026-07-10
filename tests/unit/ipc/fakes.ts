import type { IIpcMain } from '../../../src/main/ipc/IIpcMain';
import type { ILoggingService, LogContext } from '../../../src/main/logging';

type Listener = (event: unknown, ...args: unknown[]) => unknown;

/** Captures registered `ipcMain.handle` listeners so tests can invoke them directly. */
export class FakeIpcMain implements IIpcMain {
  private readonly listeners = new Map<string, Listener>();

  handle(channel: string, listener: Listener): void {
    this.listeners.set(channel, listener);
  }

  /** Invokes a previously-registered channel's listener, as `ipcRenderer.invoke` would. */
  invoke(channel: string, payload: unknown): unknown {
    const listener = this.listeners.get(channel);
    if (!listener) {
      throw new Error(`FakeIpcMain: no handler registered for channel '${channel}'`);
    }
    return listener(undefined, payload);
  }
}

interface LoggingCall {
  source: string;
  message: string;
  context?: LogContext;
}

interface ErrorLoggingCall extends LoggingCall {
  error?: unknown;
}

/** Records every call per level so tests can assert on logging behavior. */
export class FakeLoggingService implements ILoggingService {
  public readonly debugCalls: LoggingCall[] = [];
  public readonly infoCalls: LoggingCall[] = [];
  public readonly warnCalls: LoggingCall[] = [];
  public readonly errorCalls: ErrorLoggingCall[] = [];

  debug(source: string, message: string, context?: LogContext): void {
    this.debugCalls.push({ source, message, ...(context !== undefined ? { context } : {}) });
  }

  info(source: string, message: string, context?: LogContext): void {
    this.infoCalls.push({ source, message, ...(context !== undefined ? { context } : {}) });
  }

  warn(source: string, message: string, context?: LogContext): void {
    this.warnCalls.push({ source, message, ...(context !== undefined ? { context } : {}) });
  }

  error(source: string, message: string, error?: unknown, context?: LogContext): void {
    this.errorCalls.push({
      source,
      message,
      ...(error !== undefined ? { error } : {}),
      ...(context !== undefined ? { context } : {}),
    });
  }
}
