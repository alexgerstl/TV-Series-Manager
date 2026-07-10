import type { Database } from 'better-sqlite3';

import type { Setting } from '../../models/Setting';

/**
 * Wraps the `Settings` key/value table (architecture.md §4.2). Consumed by
 * `SettingsService` (M1.5) — per §3.2, this is the only module allowed to
 * issue SQL against `Settings`.
 */
export class SettingsRepository {
  constructor(private readonly db: Database) {}

  get(key: string): string | null {
    const row = this.db
      .prepare<[string], { value: string | null }>('SELECT value FROM Settings WHERE key = ?')
      .get(key);
    return row?.value ?? null;
  }

  /** Upserts `key` — inserts if absent, overwrites `value` if already present. */
  set(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT INTO Settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, value);
  }

  getAll(): Setting[] {
    return this.db.prepare<[], Setting>('SELECT key, value FROM Settings ORDER BY key').all();
  }
}
