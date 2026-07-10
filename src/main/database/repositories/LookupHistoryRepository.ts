import type { Database } from 'better-sqlite3';

import type { LookupHistory, LookupHistoryStatus } from '../../models/LookupHistory';

import { expectRow } from './rowHelpers';

export interface CreateLookupHistoryInput {
  seriesId: number;
  status: LookupHistoryStatus;
  highestLocalEpisode?: string;
  latestOnlineEpisode?: string;
  /** Defaults to 0 (matches the column default) when omitted. */
  newEpisodeCount?: number;
  searchUrl?: string;
}

/** Wraps the `LookupHistory` table (architecture.md §4.2). */
export class LookupHistoryRepository {
  constructor(private readonly db: Database) {}

  create(input: CreateLookupHistoryInput): LookupHistory {
    const row = this.db
      .prepare<
        [number, string | null, string | null, number, string, string | null],
        LookupHistory
      >(
        `INSERT INTO LookupHistory
           (seriesId, highestLocalEpisode, latestOnlineEpisode, newEpisodeCount, status, searchUrl)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING id, seriesId, lookupDate, highestLocalEpisode, latestOnlineEpisode, newEpisodeCount, status, searchUrl`,
      )
      .get(
        input.seriesId,
        input.highestLocalEpisode ?? null,
        input.latestOnlineEpisode ?? null,
        input.newEpisodeCount ?? 0,
        input.status,
        input.searchUrl ?? null,
      );
    return expectRow(row, 'LookupHistoryRepository.create');
  }

  findById(id: number): LookupHistory | null {
    return (
      this.db
        .prepare<[number], LookupHistory>('SELECT * FROM LookupHistory WHERE id = ?')
        .get(id) ?? null
    );
  }

  /** Most recent first — backed by `idx_lookuphistory_seriesid` + `idx_lookuphistory_lookupdate`. */
  findBySeriesId(seriesId: number): LookupHistory[] {
    return this.db
      .prepare<[number], LookupHistory>(
        'SELECT * FROM LookupHistory WHERE seriesId = ? ORDER BY lookupDate DESC',
      )
      .all(seriesId);
  }

  findAll(): LookupHistory[] {
    return this.db
      .prepare<[], LookupHistory>('SELECT * FROM LookupHistory ORDER BY lookupDate DESC')
      .all();
  }
}
