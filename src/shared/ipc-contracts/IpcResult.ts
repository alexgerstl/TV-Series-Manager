import type { ErrorCode } from '../errors/ErrorCode';

/**
 * The envelope every `ipcMain.handle` channel resolves with (architecture.md
 * §5.3). Renderer code always gets one of these back — never a raw thrown
 * error — and branches on `success` to get a fully-typed `data`/`error`.
 */
export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string; details?: unknown } };

export function ok<T>(data: T): IpcResult<T> {
  return { success: true, data };
}

export function fail<T = never>(code: ErrorCode, message: string, details?: unknown): IpcResult<T> {
  return { success: false, error: { code, message, ...(details !== undefined ? { details } : {}) } };
}
