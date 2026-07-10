import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ToolConfigurationRepository } from '../../../../src/main/database/repositories/ToolConfigurationRepository';

import { createTestDb, type TestDb } from './testDb';

describe('ToolConfigurationRepository', () => {
  let testDb: TestDb;
  let repo: ToolConfigurationRepository;

  beforeEach(() => {
    testDb = createTestDb();
    repo = new ToolConfigurationRepository(testDb.db);
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it('creates a tool configuration and returns the full row', () => {
    const created = repo.create({
      name: 'MKVCleaver',
      executable: 'C:\\Users\\alexg\\mkvcleaver\\MKVCleaver_x64_v0801.exe',
    });

    expect(created.id).toBeGreaterThan(0);
    expect(created.name).toBe('MKVCleaver');
    expect(created.executable).toBe('C:\\Users\\alexg\\mkvcleaver\\MKVCleaver_x64_v0801.exe');
  });

  it('findById returns the created row', () => {
    const created = repo.create({ name: 'mkvmerge', executable: 'C:\\Program Files\\MKVToolNix\\mkvmerge.exe' });
    expect(repo.findById(created.id)).toEqual(created);
  });

  it('findByName finds an existing entry and returns null otherwise', () => {
    repo.create({ name: 'mkvmerge', executable: 'C:\\Program Files\\MKVToolNix\\mkvmerge.exe' });

    expect(repo.findByName('mkvmerge')?.executable).toBe('C:\\Program Files\\MKVToolNix\\mkvmerge.exe');
    expect(repo.findByName('nonexistent')).toBeNull();
  });

  it('findAll returns every configured tool', () => {
    repo.create({ name: 'mkvmerge', executable: 'C:\\mkvmerge.exe' });
    repo.create({ name: 'mkvextract', executable: 'C:\\mkvextract.exe' });

    expect(repo.findAll().map((t) => t.name).sort()).toEqual(['mkvextract', 'mkvmerge']);
  });

  it('rejects a duplicate name (unique index)', () => {
    repo.create({ name: 'mkvmerge', executable: 'C:\\mkvmerge.exe' });
    expect(() => repo.create({ name: 'mkvmerge', executable: 'C:\\other.exe' })).toThrow(
      /UNIQUE constraint failed/,
    );
  });
});
