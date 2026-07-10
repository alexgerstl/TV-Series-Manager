export type LookupHistoryStatus = 'UP_TO_DATE' | 'NEW_EPISODES' | 'FAILED';

/** Row shape of the `LookupHistory` table (architecture.md §4.2). */
export interface LookupHistory {
  id: number;
  seriesId: number;
  lookupDate: string;
  highestLocalEpisode: string | null;
  latestOnlineEpisode: string | null;
  newEpisodeCount: number;
  status: LookupHistoryStatus;
  searchUrl: string | null;
}
