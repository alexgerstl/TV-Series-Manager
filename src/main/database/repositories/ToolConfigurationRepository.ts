import type { Database } from 'better-sqlite3';

import type { ToolConfiguration } from '../../models/ToolConfiguration';

import { expectRow } from './rowHelpers';

export interface CreateToolConfigurationInput {
  name: string;
  executable: string;
}

/** Wraps the `ToolConfiguration` table (architecture.md §4.2). */
export class ToolConfigurationRepository {
  constructor(private readonly db: Database) {}

  create(input: CreateToolConfigurationInput): ToolConfiguration {
    const row = this.db
      .prepare<[string, string], ToolConfiguration>(
        `INSERT INTO ToolConfiguration (name, executable)
         VALUES (?, ?)
         RETURNING id, name, executable`,
      )
      .get(input.name, input.executable);
    return expectRow(row, 'ToolConfigurationRepository.create');
  }

  findById(id: number): ToolConfiguration | null {
    return (
      this.db
        .prepare<[number], ToolConfiguration>('SELECT * FROM ToolConfiguration WHERE id = ?')
        .get(id) ?? null
    );
  }

  findByName(name: string): ToolConfiguration | null {
    return (
      this.db
        .prepare<[string], ToolConfiguration>('SELECT * FROM ToolConfiguration WHERE name = ?')
        .get(name) ?? null
    );
  }

  findAll(): ToolConfiguration[] {
    return this.db
      .prepare<[], ToolConfiguration>('SELECT * FROM ToolConfiguration ORDER BY name')
      .all();
  }
}
