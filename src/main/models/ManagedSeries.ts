/** Row shape of the `ManagedSeries` table (architecture.md §4.2). */
export interface ManagedSeries {
  id: number;
  name: string;
  normalizedName: string;
  /** SQLite has no boolean type — stored/returned as 0 or 1. */
  lookupEnabled: number;
  created: string;
  updated: string;
}
