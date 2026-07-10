import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Database } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabaseConnection } from '../../../src/main/database/connection';
import { runMigrations } from '../../../src/main/database/migrationRunner';

// The real migrations directory shipped with the app — this test exercises
// the actual 0001_init.sql + 0002_core_schema.sql files, not a copy of their
// contents, per the M1.3 Definition of Done.
const MIGRATIONS_DIR = fileURLToPath(
  new URL('../../../src/main/database/migrations', import.meta.url),
);

const EXPECTED_TABLES = [
  'Settings',
  'ManagedSeries',
  'LookupHistory',
  'MKVMetadata',
  'Logs',
  'ToolConfiguration',
  'SyncLog',
] as const;

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

function getColumns(db: Database, table: string): ColumnInfo[] {
  return db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[];
}

function getIndexNames(db: Database, table: string): string[] {
  const rows = db.prepare(`PRAGMA index_list(${table})`).all() as { name: string }[];
  return rows.map((row) => row.name);
}

describe('core schema migration (0002_core_schema.sql)', () => {
  let tempDir: string;
  let db: Database;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tvsm-core-schema-test-'));
    const dbPath = join(tempDir, 'test.sqlite');
    db = createDatabaseConnection(dbPath);
    runMigrations(db, MIGRATIONS_DIR);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('applies both migrations and reaches schema version 2', () => {
    const row = db
      .prepare('SELECT MAX(version) AS v FROM schema_migrations')
      .get() as { v: number };
    expect(row.v).toBe(2);
  });

  it('creates exactly the 7 application tables specified in architecture.md §4.2', () => {
    const tables = db
      .prepare<[], { name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_migrations'",
      )
      .all()
      .map((row) => row.name)
      .sort();

    expect(tables).toEqual([...EXPECTED_TABLES].sort());
  });

  describe('Settings', () => {
    it('has key (TEXT PRIMARY KEY) and value (TEXT) columns', () => {
      const columns = getColumns(db, 'Settings');
      const key = columns.find((c) => c.name === 'key');
      const value = columns.find((c) => c.name === 'value');

      expect(key?.pk).toBe(1);
      expect(key?.type).toBe('TEXT');
      expect(value?.type).toBe('TEXT');
    });
  });

  describe('ManagedSeries', () => {
    it('has the expected columns', () => {
      const names = getColumns(db, 'ManagedSeries').map((c) => c.name);
      expect(names).toEqual([
        'id',
        'name',
        'normalizedName',
        'lookupEnabled',
        'created',
        'updated',
      ]);
    });

    it('has a unique index on normalizedName', () => {
      expect(getIndexNames(db, 'ManagedSeries')).toContain('idx_managedseries_normalizedname');

      db.prepare(
        'INSERT INTO ManagedSeries (name, normalizedName) VALUES (?, ?)',
      ).run('House of the Dragon', 'House of the Dragon');

      expect(() =>
        db
          .prepare('INSERT INTO ManagedSeries (name, normalizedName) VALUES (?, ?)')
          .run('House of the Dragon (dup)', 'House of the Dragon'),
      ).toThrow(/UNIQUE constraint failed/);
    });

    it('defaults lookupEnabled to 1', () => {
      const info = db
        .prepare('INSERT INTO ManagedSeries (name, normalizedName) VALUES (?, ?) RETURNING lookupEnabled')
        .get('Dexter', 'Dexter') as { lookupEnabled: number };
      expect(info.lookupEnabled).toBe(1);
    });
  });

  describe('LookupHistory', () => {
    it('has the expected columns and indexes', () => {
      const names = getColumns(db, 'LookupHistory').map((c) => c.name);
      expect(names).toEqual([
        'id',
        'seriesId',
        'lookupDate',
        'highestLocalEpisode',
        'latestOnlineEpisode',
        'newEpisodeCount',
        'status',
        'searchUrl',
      ]);

      const indexes = getIndexNames(db, 'LookupHistory');
      expect(indexes).toContain('idx_lookuphistory_seriesid');
      expect(indexes).toContain('idx_lookuphistory_lookupdate');
    });

    it('cascade-deletes when the referenced ManagedSeries row is deleted', () => {
      const series = db
        .prepare('INSERT INTO ManagedSeries (name, normalizedName) VALUES (?, ?) RETURNING id')
        .get('Andor', 'Andor') as { id: number };

      db.prepare(
        'INSERT INTO LookupHistory (seriesId, status) VALUES (?, ?)',
      ).run(series.id, 'UP_TO_DATE');

      const beforeCount = db
        .prepare('SELECT COUNT(*) AS c FROM LookupHistory WHERE seriesId = ?')
        .get(series.id) as { c: number };
      expect(beforeCount.c).toBe(1);

      db.prepare('DELETE FROM ManagedSeries WHERE id = ?').run(series.id);

      const afterCount = db
        .prepare('SELECT COUNT(*) AS c FROM LookupHistory WHERE seriesId = ?')
        .get(series.id) as { c: number };
      expect(afterCount.c).toBe(0);
    });

    it('rejects a seriesId that does not reference an existing ManagedSeries row', () => {
      expect(() =>
        db.prepare('INSERT INTO LookupHistory (seriesId, status) VALUES (?, ?)').run(9999, 'FAILED'),
      ).toThrow(/FOREIGN KEY constraint failed/);
    });
  });

  describe('MKVMetadata', () => {
    it('has the expected columns and a unique index on fullPath', () => {
      const names = getColumns(db, 'MKVMetadata').map((c) => c.name);
      expect(names).toEqual(['id', 'fullPath', 'fileSize', 'modified', 'json']);
      expect(getIndexNames(db, 'MKVMetadata')).toContain('idx_mkvmetadata_fullpath');
    });
  });

  describe('Logs', () => {
    it('has the expected columns and indexes', () => {
      const names = getColumns(db, 'Logs').map((c) => c.name);
      expect(names).toEqual(['id', 'timestamp', 'level', 'source', 'message', 'exception']);

      const indexes = getIndexNames(db, 'Logs');
      expect(indexes).toContain('idx_logs_timestamp');
      expect(indexes).toContain('idx_logs_level');
    });
  });

  describe('ToolConfiguration', () => {
    it('has the expected columns and a unique index on name', () => {
      const names = getColumns(db, 'ToolConfiguration').map((c) => c.name);
      expect(names).toEqual(['id', 'name', 'executable']);
      expect(getIndexNames(db, 'ToolConfiguration')).toContain('idx_toolconfiguration_name');
    });
  });

  describe('SyncLog', () => {
    it('has the expected columns and a timestamp index (closes SRS §17.11 gap)', () => {
      const names = getColumns(db, 'SyncLog').map((c) => c.name);
      expect(names).toEqual([
        'id',
        'timestamp',
        'operation',
        'sourcePath',
        'destPath',
        'durationMs',
        'verified',
        'verifyMethod',
        'result',
        'errorMessage',
      ]);
      expect(getIndexNames(db, 'SyncLog')).toContain('idx_synclog_timestamp');
    });

    it('defaults verified to 0', () => {
      const row = db
        .prepare(
          'INSERT INTO SyncLog (operation, sourcePath, destPath, result) VALUES (?, ?, ?, ?) RETURNING verified',
        )
        .get('COPY', 'C:\\local\\file.mkv', 'X:\\Serien\\file.mkv', 'SUCCESS') as {
        verified: number;
      };
      expect(row.verified).toBe(0);
    });
  });

  it('is idempotent against an already-migrated database (re-running applies nothing)', () => {
    const result = runMigrations(db, MIGRATIONS_DIR);
    expect(result.applied).toHaveLength(0);
    expect(result.currentVersion).toBe(2);
  });
});
