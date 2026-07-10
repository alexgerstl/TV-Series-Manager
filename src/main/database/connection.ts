import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import BetterSqlite3 from 'better-sqlite3';

/**
 * Opens (creating if absent) the SQLite database at `dbPath`.
 *
 * Per architecture.md §2/§4: SQLite via `better-sqlite3`, synchronous API.
 * Sets `foreign_keys = ON` (required for the `LookupHistory.seriesId`
 * cascade-delete relationship defined in architecture.md §4.2) and
 * `journal_mode = WAL` (better concurrent read/write behavior for a desktop
 * app whose UI polls/queries while background operations write).
 */
export function createDatabaseConnection(dbPath: string): BetterSqlite3.Database {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new BetterSqlite3(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  return db;
}
