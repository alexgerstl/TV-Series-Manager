import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { Database } from 'better-sqlite3';

import { MigrationError } from './errors';

/**
 * Matches migration filenames like `0001_init.sql`, `0002_core_schema.sql`.
 * The numeric prefix is the migration's `version`; everything after the
 * first underscore (up to `.sql`) is purely descriptive and not parsed.
 */
const MIGRATION_FILENAME_PATTERN = /^(\d+)_.+\.sql$/;

interface MigrationFile {
  version: number;
  fileName: string;
  fullPath: string;
}

export interface MigrationRunResult {
  /** Migrations that were applied during this run, in ascending version order. */
  applied: MigrationFile[];
  /** Highest migration version now recorded as applied (0 if none). */
  currentVersion: number;
}

/**
 * Applies all pending SQL migrations found in `migrationsDir` against `db`,
 * in ascending version order, tracked via a `schema_migrations` table.
 *
 * Per architecture.md §4.3:
 * - `schema_migrations(version INTEGER PRIMARY KEY, appliedAt DATETIME)`
 *   tracks applied migrations.
 * - Each migration runs inside its own transaction; on failure the
 *   transaction rolls back (better-sqlite3's `db.transaction()` default
 *   behavior) so no partial schema change and no `schema_migrations` row are
 *   left behind — the migration remains "pending" and will be retried on the
 *   next run.
 * - The app "refuses to start if a migration fails": this function throws a
 *   `MigrationError` rather than swallowing or partially continuing.
 *
 * Idempotent: running twice against an already-migrated database applies
 * nothing on the second run and returns an empty `applied` list.
 */
export function runMigrations(db: Database, migrationsDir: string): MigrationRunResult {
  ensureMigrationsTable(db);

  const migrationFiles = discoverMigrationFiles(migrationsDir);
  const appliedVersions = getAppliedVersions(db);

  const applied: MigrationFile[] = [];

  for (const migration of migrationFiles) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    applyMigration(db, migration);
    applied.push(migration);
  }

  const currentVersion = getCurrentVersion(db);

  return { applied, currentVersion };
}

function ensureMigrationsTable(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version   INTEGER PRIMARY KEY,
      appliedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function discoverMigrationFiles(migrationsDir: string): MigrationFile[] {
  const entries = readdirSync(migrationsDir);

  const migrations: MigrationFile[] = [];
  for (const fileName of entries) {
    const match = MIGRATION_FILENAME_PATTERN.exec(fileName);
    if (!match?.[1]) {
      continue;
    }

    migrations.push({
      version: Number.parseInt(match[1], 10),
      fileName,
      fullPath: join(migrationsDir, fileName),
    });
  }

  migrations.sort((a, b) => a.version - b.version);

  const seen = new Set<number>();
  for (const migration of migrations) {
    if (seen.has(migration.version)) {
      throw new Error(
        `Duplicate migration version ${migration.version} found in ${migrationsDir} ` +
          `(conflicting file: ${migration.fileName})`,
      );
    }
    seen.add(migration.version);
  }

  return migrations;
}

function getAppliedVersions(db: Database): Set<number> {
  const rows = db.prepare<[], { version: number }>('SELECT version FROM schema_migrations').all();
  return new Set(rows.map((row) => row.version));
}

function getCurrentVersion(db: Database): number {
  const row = db
    .prepare<[], { maxVersion: number | null }>(
      'SELECT MAX(version) AS maxVersion FROM schema_migrations',
    )
    .get();
  return row?.maxVersion ?? 0;
}

function applyMigration(db: Database, migration: MigrationFile): void {
  const sql = readFileSync(migration.fullPath, 'utf-8');

  const applyInTransaction = db.transaction(() => {
    db.exec(sql);
    db.prepare(
      'INSERT INTO schema_migrations (version, appliedAt) VALUES (?, CURRENT_TIMESTAMP)',
    ).run(migration.version);
  });

  try {
    applyInTransaction();
  } catch (cause) {
    // db.transaction() has already rolled back at this point — no partial
    // schema change, no schema_migrations row for this version.
    throw new MigrationError(migration.version, migration.fileName, cause);
  }
}
