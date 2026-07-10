import {
  settingsGetRequestSchema,
  settingsSetRequestSchema,
} from '../../shared/ipc-contracts/settings';
import type { ILoggingService } from '../logging';
import type { ISettingsService } from '../settings';

import type { IIpcMain } from './IIpcMain';
import { registerIpcHandler } from './registerIpcHandler';

/**
 * Registers `settings:get` / `settings:set` (architecture.md §5.2) — the
 * one working example channel required by M1.7.
 */
export function registerSettingsHandlers(
  ipcMain: IIpcMain,
  settingsService: ISettingsService,
  logging: ILoggingService,
): void {
  registerIpcHandler(ipcMain, logging, 'settings:get', settingsGetRequestSchema, ({ key }) =>
    settingsService.get(key),
  );

  registerIpcHandler(ipcMain, logging, 'settings:set', settingsSetRequestSchema, ({ key, value }) => {
    settingsService.set(key, value);
    return null;
  });
}
