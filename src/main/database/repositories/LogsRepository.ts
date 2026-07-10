import type { Database } from 'better-sqlite3';

import type { LogEntry, LogLevel } from '../../models/LogEntry';

import { expectRow } from './rowHelpers';

export interface CreateLogEntryInput {
  level: LogLevel;
  source: string;
  message: string;
  exception?: string;
}

/**
 * Wraps the `Logs` table (architecture.md §4.2). Consumed by
 * `LoggingService` (M1.6), including its password-redaction rule (§6) —
 * this repository does not interpret `message`/`exception` content.
 */
export class LogsRepository {
  constructor(private readonly db: Database) {}

  create(input: CreateLogEntryInput): LogEntry {
    const row = this.db
      .prepare<[string, string, string, string | null], LogEntry>(
        `INSERT INTO Logs (level, source, message, exception)
         VALUES (?, ?, ?, ?)
         RETURNING id, timestamp, level, source, message, exception`,
      )
      .get(input.level, input.source, input.message, input.exception ?? null);
    return expectRow(row, 'LogsRepository.create');
  }

  findById(id: number): LogEntry | null {
    return this.db.prepare<[number], LogEntry>('SELECT * FROM Logs WHERE id = ?').get(id) ?? null;
  }

  findAll(): LogEntry[] {
    return this.db.prepare<[], LogEntry>('SELECT * FROM Logs ORDER BY timestamp DESC').all();
  }
}
