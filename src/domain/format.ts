const dayKey = (d: Date, tz?: string) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Date.UTC(get('year'), get('month') - 1, get('day')) / 86_400_000;
};

/** 'Today 9:00 PM', 'Thu 9:00 PM' within the next 7 days, else 'Nov 12'. `tz` defaults to the device zone. */
export function formatAirTime(iso: string, now: Date, tz?: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '—';
  const diff = dayKey(at, tz) - dayKey(now, tz);
  const time = new Intl.DateTimeFormat(undefined, { timeZone: tz, hour: 'numeric', minute: '2-digit' })
    .format(at)
    .replace(/[  ]/g, ' ');
  if (diff === 0) return `Today ${time}`;
  if (diff > 0 && diff < 7) {
    return `${new Intl.DateTimeFormat(undefined, { timeZone: tz, weekday: 'short' }).format(at)} ${time}`;
  }
  return new Intl.DateTimeFormat(undefined, { timeZone: tz, month: 'short', day: 'numeric' }).format(at);
}

/** The one episode code format used on every screen: 'S01E02'. */
export function episodeCode(e: { seasonNumber: number; episodeNumber: number }): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `S${pad(e.seasonNumber)}E${pad(e.episodeNumber)}`;
}

export function formatBytes(n?: number): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  if (n < 1024) return `${Math.round(n)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

/** '5 min ago', '3 h ago', '2 d ago', then 'Oct 1' (with the year when it isn't this one). */
export function formatRelative(iso: string, now: Date): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '—';
  const mins = Math.floor((now.getTime() - at.getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)} h ago`;
  if (mins < 7 * 24 * 60) return `${Math.floor(mins / (24 * 60))} d ago`;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: at.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(at);
}
