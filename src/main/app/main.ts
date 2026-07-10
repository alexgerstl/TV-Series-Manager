import { app, BrowserWindow } from 'electron';

import { createMainWindow } from './createWindow';

// Architecture §1.3 / §6: single window, no nodeIntegration, contextIsolation on.
// No services are wired up yet — this is the M1.1 scaffold task only.
void app.whenReady().then(() => {
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
