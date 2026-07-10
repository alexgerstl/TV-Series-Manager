export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Row shape of the `Logs` table (architecture.md §4.2). Named `LogEntry` to avoid colliding with the table name. */
export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  exception: string | null;
}
