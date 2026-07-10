import { defineConfig } from '@playwright/test';

/**
 * Playwright (Electron mode) — architecture.md §8 End-to-end row: "Full app
 * launch → ... verify files land in the right library folder; Settings
 * persistence...". Electron mode drives the already-installed `electron`
 * binary directly via CDP — no Chromium/Firefox/WebKit browser download is
 * needed, so this suite runs without `npx playwright install`.
 *
 * Specs launch the *built* app (`dist/main/main.js`), so `npm run build`
 * must run first — see the `pretest:e2e` script in package.json.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
});
