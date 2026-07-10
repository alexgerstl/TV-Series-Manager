import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ManagedSeriesRepository } from '../../../../src/main/database/repositories/ManagedSeriesRepository';

import { createTestDb, type TestDb } from './testDb';

describe('ManagedSeriesRepository', () => {
  let testDb: TestDb;
  let repo: ManagedSeriesRepository;

  beforeEach(() => {
    testDb = createTestDb();
    repo = new ManagedSeriesRepository(testDb.db);
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it('creates a series and returns the full row, defaulting lookupEnabled to 1', () => {
    const created = repo.create({ name: 'House of the Dragon', normalizedName: 'House of the Dragon' });

    expect(created.id).toBeGreaterThan(0);
    expect(created.name).toBe('House of the Dragon');
    expect(created.normalizedName).toBe('House of the Dragon');
    expect(created.lookupEnabled).toBe(1);
    expect(created.created).toBeTruthy();
    expect(created.updated).toBeTruthy();
  });

  it('respects an explicit lookupEnabled value on create', () => {
    const created = repo.create({
      name: 'Andor',
      normalizedName: 'Andor',
      lookupEnabled: 0,
    });

    expect(created.lookupEnabled).toBe(0);
  });

  it('findById returns the created row', () => {
    const created = repo.create({ name: 'Dexter', normalizedName: 'Dexter' });
    expect(repo.findById(created.id)).toEqual(created);
  });

  it('findById returns null for a missing id', () => {
    expect(repo.findById(9999)).toBeNull();
  });

  it('findByNormalizedName finds an existing row and returns null otherwise', () => {
    repo.create({ name: 'The Bear', normalizedName: 'The Bear' });

    expect(repo.findByNormalizedName('The Bear')?.name).toBe('The Bear');
    expect(repo.findByNormalizedName('Nonexistent')).toBeNull();
  });

  it('findAll returns every created series', () => {
    repo.create({ name: 'Andor', normalizedName: 'Andor' });
    repo.create({ name: 'Dexter', normalizedName: 'Dexter' });

    expect(repo.findAll().map((s) => s.name).sort()).toEqual(['Andor', 'Dexter']);
  });

  it('rejects a duplicate normalizedName (unique index)', () => {
    repo.create({ name: 'Dexter', normalizedName: 'Dexter' });
    expect(() => repo.create({ name: 'Dexter (dup)', normalizedName: 'Dexter' })).toThrow(
      /UNIQUE constraint failed/,
    );
  });
});
