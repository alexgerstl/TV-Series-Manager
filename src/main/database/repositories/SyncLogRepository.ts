import type { Database } from 'better-sqlite3';

import type { SyncLog, SyncOperation, SyncResult } from '../../models/SyncLog';

import { expectRow } from './rowHelpers';

export interface CreateSyncLogInput {
  operation: SyncOperation;
  sourcePath: string;
  destPath: string;
  durationMs?: number;
  /** Defaults to 0 (matches the column default) when omitted. */
  verified?: number;
  verifyMethod?: string;
  result: SyncResult;
  errorMessage?: string;
}

/**
 * Wraps the `SyncLog` table (architecture.md §4.2) — the durable per-file
 * audit trail for `NASService` copy/move operations (SRS §17.11, decision #2).
 */
export class SyncLogRepository {
  constructor(private readonly db: Database) {}

  create(input: CreateSyncLogInput): SyncLog {
    const row = this.db
      .prepare<
        [string, string, string, number | null, number, string | null, string, string | null],
        SyncLog
      >(
        `INSERT INTO SyncLog
           (operation, sourcePath, destPath, durationMs, verified, verifyMethod, result, errorMessage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id, timestamp, operation, sourcePath, destPath, durationMs, verified, verifyMethod, result, errorMessage`,
      )
      .get(
        input.operation,
        input.sourcePath,
        input.destPath,
        input.durationMs ?? null,
        input.verified ?? 0,
        input.verifyMethod ?? null,
        input.result,
        input.errorMessage ?? null,
      );
    return expectRow(row, 'SyncLogRepository.create');
  }

  findById(id: number): SyncLog | null {
    return (
      this.db.prepare<[number], SyncLog>('SELECT * FROM SyncLog WHERE id = ?').get(id) ?? null
    );
  }

  findAll(): SyncLog[] {
    return this.db.prepare<[], SyncLog>('SELECT * FROM SyncLog ORDER BY timestamp DESC').all();
  }
}
