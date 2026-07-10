import { contextBridge } from 'electron';

/**
 * Typed bridge exposed to the renderer as `window.api`.
 *
 * Per architecture.md §1.3, this is the ONLY way the renderer talks to the
 * main process — no nodeIntegration, no direct IPC access from renderer code.
 *
 * Empty at this stage (M1.1 scaffold). The first real channel
 * (`settings:get` / `settings:set`) is wired up in M1.7.
 */
const api = {} as const;

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
