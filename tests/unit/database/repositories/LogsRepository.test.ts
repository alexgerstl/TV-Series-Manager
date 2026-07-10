import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LogsRepository } from '../../../../src/main/database/repositories/LogsRepository';

import { createTestDb, type TestDb } from './testDb';

describe('LogsRepository', () => {
  let testDb: TestDb;
  let repo: LogsRepository;

  beforeEach(() => {
    testDb = createTestDb();
    repo = new LogsRepository(testDb.db);
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it('creates a log entry and returns the full row', () => {
    const created = repo.create({
      level: 'info',
      source: 'ProcessingEngine',
      message: 'Started processing batch',
    });

    expect(created.id).toBeGreaterThan(0);
    expect(created.level).toBe('info');
    expect(created.source).toBe('ProcessingEngine');
    expect(created.message).toBe('Started processing batch');
    expect(created.exception).toBeNull();
    expect(created.timestamp).toBeTruthy();
  });

  it('stores the exception field when provided', () => {
    const created = repo.create({
      level: 'error',
      source: 'NASService',
      message: 'Mount failed',
      exception: 'Error: net use exited with code 53',
    });

    expect(created.exception).toBe('Error: net use exited with code 53');
  });

  it('findById returns the created row', () => {
    const created = repo.create({ level: 'debug', source: 'Test', message: 'hello' });
    expect(repo.findById(created.id)).toEqual(created);
  });

  it('findAll returns every log entry, most recent first', () => {
    const first = repo.create({ level: 'info', source: 'Test', message: 'first' });
    const second = repo.create({ level: 'info', source: 'Test', message: 'second' });

    const all = repo.findAll();
    expect(all.map((l) => l.id)).toContain(first.id);
    expect(all.map((l) => l.id)).toContain(second.id);
    expect(all).toHaveLength(2);
  });
});
