import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { _electron as electron, expect, test } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';

import type { Api } from '../../src/preload/index';

declare global {
  interface Window {
    api: Api;
  }
}

const MAIN_ENTRY = join(__dirname, '../../dist/main/main.js');

/**
 * M1.7 Definition of Done: "One E2E-style Playwright smoke test confirms
 * the round trip through a real Electron window." Launches the actual
 * built app (not a mock) and drives `window.api.settings` — the preload
 * bridge — exactly as real renderer code eventually will.
 */
test.describe('settings IPC round trip (M1.7)', () => {
  let userDataDir: string;
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(() => {
    if (!existsSync(MAIN_ENTRY)) {
      throw new Error(
        `Built app not found at ${MAIN_ENTRY}. Run "npm run build" before the e2e suite ` +
          '(the "pretest:e2e" npm script does this automatically).',
      );
    }
  });

  test.beforeEach(async () => {
    // A fresh --user-data-dir per test so runs don't read/write the real
    // dev userData database, and don't leak state between tests.
    userDataDir = mkdtempSync(join(tmpdir(), 'tvsm-e2e-'));

    // If this shell has ELECTRON_RUN_AS_NODE=1 set (a dev-sandbox setting
    // used to load native modules without a GUI, e.g. for M1.2's ABI
    // rebuild checks), the launched Electron binary runs as plain Node
    // instead of the full Electron runtime — `electron.app` etc. would be
    // undefined. This suite needs the real Electron app, so it's cleared
    // explicitly for the spawned process only.
    const env = { ...process.env };
    delete env['ELECTRON_RUN_AS_NODE'];

    electronApp = await electron.launch({
      args: [MAIN_ENTRY, `--user-data-dir=${userDataDir}`],
      env,
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    // Guarded: if beforeEach's electron.launch() itself threw, electronApp
    // never got assigned — don't let a cleanup TypeError mask that failure.
    await electronApp?.close();
    rmSync(userDataDir, { recursive: true, force: true });
  });

  test('window.api.settings bridge is exposed by the preload script', async () => {
    const hasApi = await page.evaluate(() => typeof window.api?.settings?.get === 'function');
    expect(hasApi).toBe(true);
  });

  test('settings:set followed by settings:get round-trips a value end-to-end', async () => {
    const setResult = await page.evaluate(() => window.api.settings.set('theme', 'dark'));
    expect(setResult).toEqual({ success: true, data: null });

    const getResult = await page.evaluate(() => window.api.settings.get('theme'));
    expect(getResult).toEqual({ success: true, data: 'dark' });
  });

  test('settings:get returns a typed null for a key that was never set', async () => {
    const getResult = await page.evaluate(() => window.api.settings.get('never-set-key'));
    expect(getResult).toEqual({ success: true, data: null });
  });

  test('settings:get rejects an invalid request with a validated error envelope', async () => {
    const getResult = await page.evaluate(() => window.api.settings.get(''));
    expect(getResult).toMatchObject({ success: false, error: { code: 'VALIDATION_FAILED' } });
  });
});
