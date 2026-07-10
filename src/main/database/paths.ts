import { join } from 'node:path';

/**
 * Resolves the SQLite database file path for a given Electron `userData`
 * directory.
 *
 * Kept as a pure function (no direct `app.getPath()` call) so it can be
 * unit-tested without an Electron runtime. Callers in the main process pass
 * `app.getPath('userData')`.
 */
export function getDefaultDatabasePath(userDataDir: string): string {
  return join(userDataDir, 'tv-series-manager.sqlite');
}
