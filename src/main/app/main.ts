import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';

import type { InitializeDatabaseResult } from '../database';
import { initializeDatabase, MigrationError } from '../database';
import { LogsRepository, SettingsRepository } from '../database/repositories';
import { registerSettingsHandlers } from '../ipc';
import { createPinoConsoleSink, LoggingService } from '../logging';
import { SettingsService } from '../settings';

import { createMainWindow } from './createWindow';

// Architecture §1.3 / §6: single window, no nodeIntegration, contextIsolation on.
void app.whenReady().then(() => {
  // The DB itself isn't up yet at this point, so a migration failure here
  // can only go to the console — there is no Logs table to write to.
  let initResult: InitializeDatabaseResult;
  try {
    initResult = initializeDatabase(app.getPath('userData'));
  } catch (error) {
    // architecture.md §4.3: "app refuses to start if a migration fails" —
    // fail loud, do not create a window on top of a broken/partial schema.
    if (error instanceof MigrationError) {
      console.error(`[database] startup halted: ${error.message}`);
    } else {
      console.error('[database] startup halted due to an unexpected error:', error);
    }
    app.quit();
    return;
  }

  const { db, dbPath, appliedMigrationCount, currentVersion } = initResult;

  const logging = new LoggingService(new LogsRepository(db), createPinoConsoleSink());
  const settingsService = new SettingsService(new SettingsRepository(db), safeStorage);

  logging.info('app', `Database ready at ${dbPath}`, { appliedMigrationCount, currentVersion });

  // §3.2: `ipc/` is the only place `ipcMain.handle` is called.
  registerSettingsHandlers(ipcMain, settingsService, logging);

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
