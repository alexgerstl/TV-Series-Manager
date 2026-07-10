import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabaseConnection } from '../../../src/main/database/connection';

describe('createDatabaseConnection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tvsm-connection-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates the database file if it does not exist', () => {
    const dbPath = join(tempDir, 'test.sqlite');
    expect(existsSync(dbPath)).toBe(false);

    const db = createDatabaseConnection(dbPath);
    db.close();

    expect(existsSync(dbPath)).toBe(true);
  });

  it('creates intermediate directories if they do not exist', () => {
    const dbPath = join(tempDir, 'nested', 'deeper', 'test.sqlite');

    const db = createDatabaseConnection(dbPath);
    db.close();

    expect(existsSync(dbPath)).toBe(true);
  });

  it('enables foreign key constraints', () => {
    const dbPath = join(tempDir, 'test.sqlite');
    const db = createDatabaseConnection(dbPath);

    const result = db.pragma('foreign_keys', { simple: true });
    db.close();

    expect(result).toBe(1);
  });

  it('reopens an existing database without error and preserves data', () => {
    const dbPath = join(tempDir, 'test.sqlite');

    const db1 = createDatabaseConnection(dbPath);
    db1.exec('CREATE TABLE t (id INTEGER PRIMARY KEY)');
    db1.exec('INSERT INTO t (id) VALUES (1)');
    db1.close();

    const db2 = createDatabaseConnection(dbPath);
    const row = db2.prepare('SELECT id FROM t').get() as { id: number };
    db2.close();

    expect(row.id).toBe(1);
  });
});
