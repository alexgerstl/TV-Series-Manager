/**
 * The subset of Electron's `ipcMain` this module needs. Narrow on purpose —
 * matching the `ISafeStorage`/`IConsoleSink` pattern from M1.5/M1.6 — so the
 * handler-registration pattern is unit-testable under plain Node/Vitest
 * without a real Electron runtime. `ipcMain` itself satisfies this
 * structurally; `main.ts` passes the real one.
 */
export interface IIpcMain {
  handle(
    channel: string,
    listener: (event: unknown, ...args: unknown[]) => unknown,
  ): void;
}
