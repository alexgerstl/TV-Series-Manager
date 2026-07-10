import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SettingsRepository } from '../../../../src/main/database/repositories/SettingsRepository';

import { createTestDb, type TestDb } from './testDb';

describe('SettingsRepository', () => {
  let testDb: TestDb;
  let repo: SettingsRepository;

  beforeEach(() => {
    testDb = createTestDb();
    repo = new SettingsRepository(testDb.db);
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it('returns null for a key that has never been set', () => {
    expect(repo.get('incomingPath')).toBeNull();
  });

  it('round-trips a value through set/get', () => {
    repo.set('incomingPath', 'C:\\Users\\alexg\\Incoming');
    expect(repo.get('incomingPath')).toBe('C:\\Users\\alexg\\Incoming');
  });

  it('overwrites an existing value on a second set (upsert)', () => {
    repo.set('theme', 'light');
    repo.set('theme', 'dark');

    expect(repo.get('theme')).toBe('dark');

    const all = testDb.db.prepare('SELECT COUNT(*) AS c FROM Settings WHERE key = ?').get('theme') as {
      c: number;
    };
    expect(all.c).toBe(1);
  });

  it('getAll returns every stored setting', () => {
    repo.set('theme', 'dark');
    repo.set('windowWidth', '1280');

    const all = repo.getAll();

    expect(all).toEqual(
      expect.arrayContaining([
        { key: 'theme', value: 'dark' },
        { key: 'windowWidth', value: '1280' },
      ]),
    );
    expect(all).toHaveLength(2);
  });
});
