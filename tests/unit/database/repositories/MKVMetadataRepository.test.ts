import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MKVMetadataRepository } from '../../../../src/main/database/repositories/MKVMetadataRepository';

import { createTestDb, type TestDb } from './testDb';

describe('MKVMetadataRepository', () => {
  let testDb: TestDb;
  let repo: MKVMetadataRepository;

  beforeEach(() => {
    testDb = createTestDb();
    repo = new MKVMetadataRepository(testDb.db);
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it('creates a cache entry and returns the full row', () => {
    const created = repo.create({
      fullPath: 'C:\\Data\\Serien\\house.of.the.dragon.S03\\House.of.the.Dragon.S03E03.mkv',
      fileSize: 1_234_567,
      modified: '2026-07-10 12:00:00',
      json: '{"tracks":[]}',
    });

    expect(created.id).toBeGreaterThan(0);
    expect(created.fullPath).toContain('House.of.the.Dragon.S03E03.mkv');
    expect(created.fileSize).toBe(1_234_567);
    expect(created.json).toBe('{"tracks":[]}');
  });

  it('findById returns the created row', () => {
    const created = repo.create({
      fullPath: 'C:\\file.mkv',
      fileSize: 1,
      modified: '2026-07-10 12:00:00',
      json: '{}',
    });
    expect(repo.findById(created.id)).toEqual(created);
  });

  it('findByFullPath finds an existing entry and returns null otherwise', () => {
    repo.create({
      fullPath: 'C:\\file.mkv',
      fileSize: 1,
      modified: '2026-07-10 12:00:00',
      json: '{}',
    });

    expect(repo.findByFullPath('C:\\file.mkv')?.fullPath).toBe('C:\\file.mkv');
    expect(repo.findByFullPath('C:\\nonexistent.mkv')).toBeNull();
  });

  it('findAll returns every cached entry', () => {
    repo.create({ fullPath: 'C:\\a.mkv', fileSize: 1, modified: '2026-07-10 12:00:00', json: '{}' });
    repo.create({ fullPath: 'C:\\b.mkv', fileSize: 2, modified: '2026-07-10 12:00:00', json: '{}' });

    expect(repo.findAll()).toHaveLength(2);
  });

  it('rejects a duplicate fullPath (unique index)', () => {
    repo.create({ fullPath: 'C:\\file.mkv', fileSize: 1, modified: '2026-07-10 12:00:00', json: '{}' });
    expect(() =>
      repo.create({ fullPath: 'C:\\file.mkv', fileSize: 2, modified: '2026-07-10 12:00:00', json: '{}' }),
    ).toThrow(/UNIQUE constraint failed/);
  });
});
