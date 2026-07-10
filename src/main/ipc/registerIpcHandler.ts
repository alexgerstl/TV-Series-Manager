import type { ZodType } from 'zod';

import { ErrorCode } from '../../shared/errors/ErrorCode';
import type { IpcResult } from '../../shared/ipc-contracts/IpcResult';
import type { ILoggingService } from '../logging';

import type { IIpcMain } from './IIpcMain';

/**
 * Registers a single `channel` on `ipcMain`, applying the zod-validated
 * handler-registration pattern architecture.md §5.5/§6 describes:
 *
 * - The raw request is validated against `schema` before `handler` ever
 *   runs; a failed request never reaches domain code.
 * - Every failure (validation or a thrown error) is logged via
 *   `LoggingService` with full detail, then converted into the sanitized
 *   `{code, message}` shape — the renderer never sees a raw `Error`/stack.
 * - Every response — success or failure — is the typed `IpcResult<Res>`
 *   envelope (§5.3).
 *
 * This is the only place `ipcMain.handle` should be called from (§3.2) —
 * per-domain files like `settingsHandlers.ts` call this instead.
 */
export function registerIpcHandler<Req, Res>(
  ipcMain: IIpcMain,
  logging: ILoggingService,
  channel: string,
  schema: ZodType<Req>,
  handler: (request: Req) => Res | Promise<Res>,
): void {
  ipcMain.handle(channel, async (_event: unknown, rawRequest: unknown): Promise<IpcResult<Res>> => {
    const parsed = schema.safeParse(rawRequest);
    if (!parsed.success) {
      const message = `Invalid request payload for '${channel}'`;
      logging.warn('ipc', message, { channel, issues: parsed.error.issues });
      return {
        success: false,
        error: { code: ErrorCode.VALIDATION_FAILED, message, details: parsed.error.issues },
      };
    }

    try {
      const data = await handler(parsed.data);
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logging.error('ipc', `Handler for '${channel}' threw`, error, { channel });
      return { success: false, error: { code: ErrorCode.INTERNAL_ERROR, message } };
    }
  });
}
