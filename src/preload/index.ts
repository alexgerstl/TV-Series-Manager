import { contextBridge, ipcRenderer } from 'electron';

import type {
  SettingsGetRequest,
  SettingsGetResponse,
  SettingsSetRequest,
  SettingsSetResponse,
} from '../shared/ipc-contracts/settings';

/**
 * Typed bridge exposed to the renderer as `window.api`.
 *
 * Per architecture.md §1.3, this is the ONLY way the renderer talks to the
 * main process — no nodeIntegration, no direct IPC access from renderer code.
 * Each method returns the raw `IpcResult` envelope (§5.3) — the renderer
 * branches on `success` rather than this bridge unwrapping/throwing, so
 * every caller gets the same typed success/error shape.
 */
const api = {
  settings: {
    get: (key: string): Promise<SettingsGetResponse> =>
      ipcRenderer.invoke('settings:get', { key } satisfies SettingsGetRequest) as Promise<SettingsGetResponse>,
    set: (key: string, value: string): Promise<SettingsSetResponse> =>
      ipcRenderer.invoke('settings:set', { key, value } satisfies SettingsSetRequest) as Promise<SettingsSetResponse>,
  },
} as const;

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
