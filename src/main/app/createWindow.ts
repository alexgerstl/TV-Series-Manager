import { join } from 'node:path';

import { BrowserWindow } from 'electron';

/**
 * Creates the single application window.
 *
 * Security settings follow architecture.md §6 "Electron hardening":
 * contextIsolation on, nodeIntegration off, sandbox on, no remote module.
 */
export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    // electron-vite dev server
    void window.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return window;
}
