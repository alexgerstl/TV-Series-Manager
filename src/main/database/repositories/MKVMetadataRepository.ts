import type { Database } from 'better-sqlite3';

import type { MKVMetadata } from '../../models/MKVMetadata';

import { expectRow } from './rowHelpers';

export interface CreateMKVMetadataInput {
  fullPath: string;
  fileSize: number;
  modified: string;
  json: string;
}

/**
 * Wraps the `MKVMetadata` table (architecture.md §4.2). Cache-key semantics
 * (path + size + modified) and invalidation are owned by `MetadataCache`
 * (M3.2) — this repository is a plain insert/find layer only.
 */
export class MKVMetadataRepository {
  constructor(private readonly db: Database) {}

  create(input: CreateMKVMetadataInput): MKVMetadata {
    const row = this.db
      .prepare<[string, number, string, string], MKVMetadata>(
        `INSERT INTO MKVMetadata (fullPath, fileSize, modified, json)
         VALUES (?, ?, ?, ?)
         RETURNING id, fullPath, fileSize, modified, json`,
      )
      .get(input.fullPath, input.fileSize, input.modified, input.json);
    return expectRow(row, 'MKVMetadataRepository.create');
  }

  findById(id: number): MKVMetadata | null {
    return (
      this.db.prepare<[number], MKVMetadata>('SELECT * FROM MKVMetadata WHERE id = ?').get(id) ??
      null
    );
  }

  findByFullPath(fullPath: string): MKVMetadata | null {
    return (
      this.db
        .prepare<[string], MKVMetadata>('SELECT * FROM MKVMetadata WHERE fullPath = ?')
        .get(fullPath) ?? null
    );
  }

  findAll(): MKVMetadata[] {
    return this.db.prepare<[], MKVMetadata>('SELECT * FROM MKVMetadata').all();
  }
}
