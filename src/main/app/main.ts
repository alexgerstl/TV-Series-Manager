import { app, BrowserWindow } from 'electron';

import { initializeDatabase, MigrationError } from '../database';

import { createMainWindow } from './createWindow';

// Architecture §1.3 / §6: single window, no nodeIntegration, contextIsolation on.
void app.whenReady().then(() => {
  // NOTE: using console.error for now — LoggingService (M1.6) will replace
  // this with structured logging to the Logs table per architecture.md §1.2.
  try {
    const { dbPath, appliedMigrationCount, currentVersion } = initializeDatabase(
      app.getPath('userData'),
    );
    console.log(
      `[database] ready at ${dbPath} — applied ${appliedMigrationCount} migration(s), ` +
        `now at schema version ${currentVersion}`,
    );
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
