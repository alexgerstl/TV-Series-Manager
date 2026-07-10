import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Database } from 'better-sqlite3';

import { createDatabaseConnection } from '../../../../src/main/database/connection';
import { runMigrations } from '../../../../src/main/database/migrationRunner';

// The real migrations directory shipped with the app, per the M1.3 pattern
// (tests/integration/database/coreSchema.test.ts) — repository tests run
// against the actual schema, not a hand-copied fragment of it.
const MIGRATIONS_DIR = fileURLToPath(
  new URL('../../../../src/main/database/migrations', import.meta.url),
);

export interface TestDb {
  db: Database;
  cleanup: () => void;
}

/** Creates a fresh, fully-migrated temp SQLite database for a single test. */
export function createTestDb(): TestDb {
  const tempDir = mkdtempSync(join(tmpdir(), 'tvsm-repo-test-'));
  const db = createDatabaseConnection(join(tempDir, 'test.sqlite'));
  runMigrations(db, MIGRATIONS_DIR);

  return {
    db,
    cleanup: () => {
      db.close();
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}
