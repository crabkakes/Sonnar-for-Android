import type { Episode, Series } from '../api/types';

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

export type EpisodeStatus =
  | { kind: 'downloaded'; quality?: string }
  | { kind: 'missing' }
  | { kind: 'unaired'; at?: string }
  | { kind: 'unmonitored' };

export function episodeStatus(e: Episode, now: Date): EpisodeStatus {
  if (e.hasFile) return { kind: 'downloaded', quality: e.episodeFile?.quality?.quality?.name };
  const at = e.airDateUtc ? new Date(e.airDateUtc) : null;
  if (!e.airDateUtc || !at || Number.isNaN(at.getTime()) || at.getTime() > now.getTime()) {
    return { kind: 'unaired', at: e.airDateUtc };
  }
  return e.monitored ? { kind: 'missing' } : { kind: 'unmonitored' };
}

export type SeasonGroup = {
  seasonNumber: number;
  title: string;
  monitored: boolean;
  have: number;
  total: number;
  episodes: Episode[];
};

/** Newest season first, Specials (season 0) last; episodes descending within each season. */
export function groupSeasons(series: Series, episodes: Episode[]): SeasonGroup[] {
  const numbers = new Set<number>([...series.seasons.map((s) => s.seasonNumber), ...episodes.map((e) => e.seasonNumber)]);
  return [...numbers]
    .sort((a, b) => (a === 0 ? 1 : b === 0 ? -1 : b - a))
    .map((seasonNumber) => {
      const eps = episodes.filter((e) => e.seasonNumber === seasonNumber).sort((a, b) => b.episodeNumber - a.episodeNumber);
      return {
        seasonNumber,
        title: seasonNumber === 0 ? 'Specials' : `Season ${seasonNumber}`,
        monitored: series.seasons.find((s) => s.seasonNumber === seasonNumber)?.monitored ?? false,
        have: eps.filter((e) => e.hasFile).length,
        total: eps.length,
        episodes: eps,
      };
    });
}
