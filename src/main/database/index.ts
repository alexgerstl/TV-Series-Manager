import { join } from 'node:path';

import type { Database } from 'better-sqlite3';

import { createDatabaseConnection } from './connection';
import { runMigrations } from './migrationRunner';
import { getDefaultDatabasePath } from './paths';

export { createDatabaseConnection } from './connection';
export { MigrationError } from './errors';
export type { MigrationRunResult } from './migrationRunner';
export { runMigrations } from './migrationRunner';
export { getDefaultDatabasePath } from './paths';
export * from './repositories';

const DEFAULT_MIGRATIONS_DIR = join(__dirname, 'migrations');

export interface InitializeDatabaseResult {
  db: Database;
  dbPath: string;
  appliedMigrationCount: number;
  currentVersion: number;
}

/**
 * Opens (creating if absent) the application database under `userDataDir`
 * and applies any pending migrations.
 *
 * Throws `MigrationError` if a migration fails — callers (currently
 * `main.ts`) are expected to log this and halt startup per architecture.md
 * §4.3 ("app refuses to start if a migration fails").
 */
export function initializeDatabase(
  userDataDir: string,
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR,
): InitializeDatabaseResult {
  const dbPath = getDefaultDatabasePath(userDataDir);
  const db = createDatabaseConnection(dbPath);
  const { applied, currentVersion } = runMigrations(db, migrationsDir);

  return {
    db,
    dbPath,
    appliedMigrationCount: applied.length,
    currentVersion,
  };
}
