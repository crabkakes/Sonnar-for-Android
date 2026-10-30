import type { Release } from '../api/types';

export type ReleaseSort = 'sonarr' | 'size' | 'seeders' | 'age';

export function resolutionChips(rs: Release[]): number[] {
  const found = new Set<number>();
  for (const r of rs) {
    const res = r.quality?.quality?.resolution;
    if (res !== undefined && res > 0) found.add(res);
  }
  return [...found].sort((a, b) => a - b);
}

export function filterReleases(rs: Release[], f: { resolution?: number; hideRejected: boolean }): Release[] {
  return rs.filter(
    (r) => (!f.hideRejected || !r.rejected) && (f.resolution === undefined || r.quality?.quality?.resolution === f.resolution),
  );
}

/** Stable. Undefined values always sort last. */
export function sortReleases(rs: Release[], sort: ReleaseSort): Release[] {
  if (sort === 'sonarr') return rs;
  const key = (r: Release): number | undefined => (sort === 'size' ? r.size : sort === 'seeders' ? r.seeders : r.ageHours);
  const dir = sort === 'age' ? 1 : -1;
  return rs
    .map((r, i) => ({ r, i, k: key(r) }))
    .sort((a, b) => {
      if (a.k === undefined || b.k === undefined) {
        return a.k === b.k ? a.i - b.i : a.k === undefined ? 1 : -1;
      }
      return (a.k - b.k) * dir || a.i - b.i;
    })
    .map((x) => x.r);
}

/** '5 h', '2 d', '3 mo'; '—' when unknown. */
export function formatAge(hours?: number): string {
  if (hours === undefined || Number.isNaN(hours)) return '—';
  if (hours < 1) return '<1 h';
  if (hours < 48) return `${Math.floor(hours)} h`;
  const days = Math.floor(hours / 24);
  return days < 90 ? `${days} d` : `${Math.floor(days / 30)} mo`;
}
