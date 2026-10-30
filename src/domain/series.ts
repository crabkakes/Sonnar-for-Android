import type { Series } from '../api/types';

export type SeriesStatus =
  | { kind: 'missing'; count: number }
  | { kind: 'next'; at: string }
  | { kind: 'ended' }
  | { kind: 'none' };

export function seriesSummary(s: Series, _now: Date): { counts: string; status: SeriesStatus; progress: number } {
  const have = s.statistics?.episodeFileCount ?? 0;
  const total = s.statistics?.episodeCount ?? 0;
  const missing = Math.max(0, total - have);
  let status: SeriesStatus = { kind: 'none' };
  if (missing > 0) status = { kind: 'missing', count: missing };
  else if (s.nextAiring) status = { kind: 'next', at: s.nextAiring };
  else if (s.status === 'ended') status = { kind: 'ended' };
  return { counts: `${have}/${total} episodes`, status, progress: total > 0 ? Math.min(1, have / total) : 0 };
}
