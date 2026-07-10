import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Database } from 'better-sqlite3';
import BetterSqlite3 from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MigrationError } from '../../../src/main/database/errors';
import { runMigrations } from '../../../src/main/database/migrationRunner';

describe('runMigrations', () => {
  let tempDir: string;
  let migrationsDir: string;
  let db: Database;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tvsm-migrations-test-'));
    migrationsDir = join(tempDir, 'migrations');
    mkdirSync(migrationsDir);
    db = new BetterSqlite3(':memory:');
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  function writeMigration(fileName: string, sql: string): void {
    writeFileSync(join(migrationsDir, fileName), sql, 'utf-8');
  }

  it('applies all migrations to a fresh database, in ascending version order', () => {
    writeMigration('0002_second.sql', 'CREATE TABLE second (id INTEGER PRIMARY KEY);');
    writeMigration('0001_first.sql', 'CREATE TABLE first (id INTEGER PRIMARY KEY);');

    const result = runMigrations(db, migrationsDir);

    expect(result.applied.map((m) => m.version)).toEqual([1, 2]);
    expect(result.currentVersion).toBe(2);

    // Both tables actually exist.
    const tables = db
      .prepare<[], { name: string }>("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((row) => row.name);
    expect(tables).toContain('first');
    expect(tables).toContain('second');

    // schema_migrations recorded both, with appliedAt timestamps.
    const migrationRows = db
      .prepare<[], { version: number; appliedAt: string }>(
        'SELECT version, appliedAt FROM schema_migrations ORDER BY version',
      )
      .all();
    expect(migrationRows).toHaveLength(2);
    expect(migrationRows[0]?.appliedAt).toBeTruthy();
  });

  it('is idempotent: re-running against an already-migrated database applies nothing', () => {
    writeMigration('0001_first.sql', 'CREATE TABLE first (id INTEGER PRIMARY KEY);');

    const firstRun = runMigrations(db, migrationsDir);
    expect(firstRun.applied).toHaveLength(1);

    const secondRun = runMigrations(db, migrationsDir);
    expect(secondRun.applied).toHaveLength(0);
    expect(secondRun.currentVersion).toBe(1);

    const migrationRows = db.prepare('SELECT version FROM schema_migrations').all();
    expect(migrationRows).toHaveLength(1); // no duplicate row
  });

  it('only applies newly-added pending migrations on a subsequent run', () => {
    writeMigration('0001_first.sql', 'CREATE TABLE first (id INTEGER PRIMARY KEY);');
    runMigrations(db, migrationsDir);

    writeMigration('0002_second.sql', 'CREATE TABLE second (id INTEGER PRIMARY KEY);');
    const result = runMigrations(db, migrationsDir);

    expect(result.applied.map((m) => m.version)).toEqual([2]);
    expect(result.currentVersion).toBe(2);
  });

  it('throws a MigrationError and halts on invalid SQL, leaving no partial schema change', () => {
    writeMigration('0001_good.sql', 'CREATE TABLE good (id INTEGER PRIMARY KEY);');
    writeMigration('0002_bad.sql', 'THIS IS NOT VALID SQL;');

    expect(() => runMigrations(db, migrationsDir)).toThrow(MigrationError);

    // The good migration before it was applied and recorded...
    const tables = db
      .prepare<[], { name: string }>("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((row) => row.name);
    expect(tables).toContain('good');

    const migrationRows = db
      .prepare<[], { version: number }>('SELECT version FROM schema_migrations')
      .all();
    expect(migrationRows.map((r) => r.version)).toEqual([1]);
    // ...but the bad one left no row (transaction rolled back), so it's
    // still "pending" and will be retried on the next run.
  });

  it('retries a previously-failed migration on the next run once fixed', () => {
    writeMigration('0001_bad.sql', 'THIS IS NOT VALID SQL;');
    expect(() => runMigrations(db, migrationsDir)).toThrow(MigrationError);

    // Simulate the developer fixing the migration file.
    writeMigration('0001_bad.sql', 'CREATE TABLE fixed (id INTEGER PRIMARY KEY);');

    const result = runMigrations(db, migrationsDir);
    expect(result.applied.map((m) => m.version)).toEqual([1]);
    expect(result.currentVersion).toBe(1);
  });

  it('reports the failing migration version and filename on the thrown error', () => {
    writeMigration('0003_broken.sql', 'NOT VALID;');

    try {
      runMigrations(db, migrationsDir);
      expect.fail('expected runMigrations to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(MigrationError);
      const migrationError = error as MigrationError;
      expect(migrationError.version).toBe(3);
      expect(migrationError.fileName).toBe('0003_broken.sql');
    }
  });

  it('rejects duplicate migration versions', () => {
    writeMigration('0001_first.sql', 'CREATE TABLE first (id INTEGER PRIMARY KEY);');
    writeMigration('0001_duplicate.sql', 'CREATE TABLE duplicate (id INTEGER PRIMARY KEY);');

    expect(() => runMigrations(db, migrationsDir)).toThrow(/Duplicate migration version/);
  });

  it('ignores non-migration files in the migrations directory', () => {
    writeMigration('0001_first.sql', 'CREATE TABLE first (id INTEGER PRIMARY KEY);');
    writeFileSync(join(migrationsDir, 'README.md'), '# not a migration', 'utf-8');

    const result = runMigrations(db, migrationsDir);
    expect(result.applied.map((m) => m.version)).toEqual([1]);
  });
});
