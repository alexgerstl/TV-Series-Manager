export type SyncOperation = 'COPY' | 'MOVE';
export type SyncResult = 'SUCCESS' | 'FAILED' | 'PAUSED';

/** Row shape of the `SyncLog` table (architecture.md §4.2) — per-file NAS copy/move audit trail (SRS §17.11). */
export interface SyncLog {
  id: number;
  timestamp: string;
  operation: SyncOperation;
  sourcePath: string;
  destPath: string;
  durationMs: number | null;
  /** SQLite has no boolean type — stored/returned as 0 or 1. */
  verified: number;
  verifyMethod: string | null;
  result: SyncResult;
  errorMessage: string | null;
}
