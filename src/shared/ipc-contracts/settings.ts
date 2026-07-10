import { z } from 'zod';

import type { IpcResult } from './IpcResult';

/**
 * Request schemas double as the single source of truth for both the
 * runtime `zod` validation performed at the `ipc/` boundary (architecture.md
 * §6) and the compile-time request types shared by main/preload/renderer
 * (§3.2) — derived via `z.infer` so the two can never drift apart.
 */
export const settingsGetRequestSchema = z.object({
  key: z.string().min(1),
});
export type SettingsGetRequest = z.infer<typeof settingsGetRequestSchema>;
export type SettingsGetResponse = IpcResult<string | null>;

export const settingsSetRequestSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});
export type SettingsSetRequest = z.infer<typeof settingsSetRequestSchema>;
export type SettingsSetResponse = IpcResult<null>;
