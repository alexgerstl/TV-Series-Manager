import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LookupHistoryRepository } from '../../../../src/main/database/repositories/LookupHistoryRepository';
import { ManagedSeriesRepository } from '../../../../src/main/database/repositories/ManagedSeriesRepository';

import { createTestDb, type TestDb } from './testDb';

describe('LookupHistoryRepository', () => {
  let testDb: TestDb;
  let repo: LookupHistoryRepository;
  let seriesRepo: ManagedSeriesRepository;
  let seriesId: number;

  beforeEach(() => {
    testDb = createTestDb();
    repo = new LookupHistoryRepository(testDb.db);
    seriesRepo = new ManagedSeriesRepository(testDb.db);
    seriesId = seriesRepo.create({ name: 'House of the Dragon', normalizedName: 'House of the Dragon' }).id;
  });

  afterEach(() => {
    testDb.cleanup();
  });

  it('creates a lookup result, defaulting newEpisodeCount to 0', () => {
    const created = repo.create({ seriesId, status: 'UP_TO_DATE' });

    expect(created.id).toBeGreaterThan(0);
    expect(created.seriesId).toBe(seriesId);
    expect(created.newEpisodeCount).toBe(0);
    expect(created.status).toBe('UP_TO_DATE');
    expect(created.lookupDate).toBeTruthy();
    expect(created.highestLocalEpisode).toBeNull();
  });

  it('persists all optional fields when provided', () => {
    const created = repo.create({
      seriesId,
      status: 'NEW_EPISODES',
      highestLocalEpisode: 'S03E03',
      latestOnlineEpisode: 'S03E06',
      newEpisodeCount: 3,
      searchUrl: 'https://log.rlsbb.ru/search/?s=House+of+the+Dragon+S03&cat=tv-shows',
    });

    expect(created.highestLocalEpisode).toBe('S03E03');
    expect(created.latestOnlineEpisode).toBe('S03E06');
    expect(created.newEpisodeCount).toBe(3);
    expect(created.searchUrl).toBe('https://log.rlsbb.ru/search/?s=House+of+the+Dragon+S03&cat=tv-shows');
  });

  it('findById returns the created row', () => {
    const created = repo.create({ seriesId, status: 'UP_TO_DATE' });
    expect(repo.findById(created.id)).toEqual(created);
  });

  it('findBySeriesId returns only that series’ results, most recent first', () => {
    const other = seriesRepo.create({ name: 'Dexter', normalizedName: 'Dexter' });

    const first = repo.create({ seriesId, status: 'UP_TO_DATE' });
    const second = repo.create({ seriesId, status: 'NEW_EPISODES', newEpisodeCount: 1 });
    repo.create({ seriesId: other.id, status: 'FAILED' });

    const results = repo.findBySeriesId(seriesId);

    expect(results.map((r) => r.id).sort()).toEqual([first.id, second.id].sort());
    expect(results.every((r) => r.seriesId === seriesId)).toBe(true);
  });

  it('findAll returns results across all series', () => {
    const other = seriesRepo.create({ name: 'Dexter', normalizedName: 'Dexter' });
    repo.create({ seriesId, status: 'UP_TO_DATE' });
    repo.create({ seriesId: other.id, status: 'FAILED' });

    expect(repo.findAll()).toHaveLength(2);
  });

  it('rejects a seriesId that does not reference an existing ManagedSeries row', () => {
    expect(() => repo.create({ seriesId: 9999, status: 'FAILED' })).toThrow(
      /FOREIGN KEY constraint failed/,
    );
  });
});
