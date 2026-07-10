import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SyncLogRepository } from '../../../../src/main/database/repositories/SyncLogRepository';

import { createTestDb, type TestDb } from './testDb';

describe('SyncLogRepository', () => {
  let testDb: TestDb;
  let repo: SyncLogRepository;

  beforeEach(() => {
    testDb = createTestDb();
    repo = new SyncLogRepository(testDb.db);
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it('creates a sync log entry, defaulting verified to 0', () => {
    const created = repo.create({
      operation: 'COPY',
      sourcePath: 'C:\\Data\\Serien\\house.of.the.dragon.S03\\House.of.the.Dragon.S03E03.mkv',
      destPath: 'X:\\Serien\\house.of.the.dragon.S03\\House.of.the.Dragon.S03E03.mkv',
      result: 'SUCCESS',
    });

    expect(created.id).toBeGreaterThan(0);
    expect(created.operation).toBe('COPY');
    expect(created.verified).toBe(0);
    expect(created.result).toBe('SUCCESS');
    expect(created.timestamp).toBeTruthy();
  });

  it('persists all optional fields when provided (decision #2 verify-before-delete fields)', () => {
    const created = repo.create({
      operation: 'MOVE',
      sourcePath: 'C:\\a.mkv',
      destPath: 'X:\\a.mkv',
      durationMs: 2100,
      verified: 1,
      verifyMethod: 'sha256',
      result: 'SUCCESS',
    });

    expect(created.durationMs).toBe(2100);
    expect(created.verified).toBe(1);
    expect(created.verifyMethod).toBe('sha256');
  });

  it('records a failed verification without deleting anything at the repository level', () => {
    const created = repo.create({
      operation: 'MOVE',
      sourcePath: 'C:\\a.mkv',
      destPath: 'X:\\a.mkv',
      verified: 0,
      result: 'FAILED',
      errorMessage: 'Checksum mismatch after copy',
    });

    expect(created.result).toBe('FAILED');
    expect(created.verified).toBe(0);
    expect(created.errorMessage).toBe('Checksum mismatch after copy');
  });

  it('findById returns the created row', () => {
    const created = repo.create({
      operation: 'COPY',
      sourcePath: 'C:\\a.mkv',
      destPath: 'X:\\a.mkv',
      result: 'SUCCESS',
    });
    expect(repo.findById(created.id)).toEqual(created);
  });

  it('findAll returns every sync log entry', () => {
    repo.create({ operation: 'COPY', sourcePath: 'C:\\a.mkv', destPath: 'X:\\a.mkv', result: 'SUCCESS' });
    repo.create({ operation: 'MOVE', sourcePath: 'C:\\b.mkv', destPath: 'X:\\b.mkv', result: 'FAILED' });

    expect(repo.findAll()).toHaveLength(2);
  });
});
