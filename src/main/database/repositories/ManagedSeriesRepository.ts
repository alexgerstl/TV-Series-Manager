import type { Database } from 'better-sqlite3';

import type { ManagedSeries } from '../../models/ManagedSeries';

import { expectRow } from './rowHelpers';

export interface CreateManagedSeriesInput {
  name: string;
  normalizedName: string;
  /** Defaults to 1 (matches the column default) when omitted. */
  lookupEnabled?: number;
}

/** Wraps the `ManagedSeries` table (architecture.md §4.2). */
export class ManagedSeriesRepository {
  constructor(private readonly db: Database) {}

  create(input: CreateManagedSeriesInput): ManagedSeries {
    const row = this.db
      .prepare<[string, string, number], ManagedSeries>(
        `INSERT INTO ManagedSeries (name, normalizedName, lookupEnabled)
         VALUES (?, ?, ?)
         RETURNING id, name, normalizedName, lookupEnabled, created, updated`,
      )
      .get(input.name, input.normalizedName, input.lookupEnabled ?? 1);
    return expectRow(row, 'ManagedSeriesRepository.create');
  }

  findById(id: number): ManagedSeries | null {
    return (
      this.db
        .prepare<[number], ManagedSeries>('SELECT * FROM ManagedSeries WHERE id = ?')
        .get(id) ?? null
    );
  }

  findByNormalizedName(normalizedName: string): ManagedSeries | null {
    return (
      this.db
        .prepare<[string], ManagedSeries>('SELECT * FROM ManagedSeries WHERE normalizedName = ?')
        .get(normalizedName) ?? null
    );
  }

  findAll(): ManagedSeries[] {
    return this.db.prepare<[], ManagedSeries>('SELECT * FROM ManagedSeries ORDER BY name').all();
  }
}
