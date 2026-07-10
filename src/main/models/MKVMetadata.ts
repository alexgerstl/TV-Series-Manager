/** Row shape of the `MKVMetadata` table (architecture.md §4.2) — a cached mkvmerge JSON result. */
export interface MKVMetadata {
  id: number;
  fullPath: string;
  fileSize: number;
  modified: string;
  json: string;
}
