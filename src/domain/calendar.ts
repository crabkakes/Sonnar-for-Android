import type { Episode } from '../api/types';

export type FirstWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type WeekDay = { key: string; label: string; dayOfMonth: number };

const DAY_MS = 86_400_000;
const LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Fields = { y: number; m: number; d: number; h: number; min: number; s: number };

function fieldsIn(at: Date, tz: string): Fields {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute'), s: get('second') };
}

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (utcMs: number) => new Date(utcMs).toISOString().slice(0, 10);

export function localDayKey(iso: string, tz: string): string {
  const f = fieldsIn(new Date(iso), tz);
  return `${f.y}-${pad(f.m)}-${pad(f.d)}`;
}

/** UTC instant of 00:00 local time on the calendar date `dayMs` (a UTC-midnight timestamp of that date). */
function localMidnight(dayMs: number, tz: string): Date {
  const offsetAt = (t: number) => {
    const f = fieldsIn(new Date(t), tz);
    return Date.UTC(f.y, f.m - 1, f.d, f.h, f.min, f.s) - Math.floor(t / 1000) * 1000;
  };
  let t = dayMs - offsetAt(dayMs);
  t = dayMs - offsetAt(t);
  return new Date(t);
}

export function buildWeek(anchor: Date, firstWeekday: FirstWeekday, tz: string) {
  const f = fieldsIn(anchor, tz);
  const anchorMs = Date.UTC(f.y, f.m - 1, f.d);
  const weekday = new Date(anchorMs).getUTCDay(); // 0 = Sunday
  const startMs = anchorMs - ((weekday - (firstWeekday - 1) + 7) % 7) * DAY_MS;
  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const ms = startMs + i * DAY_MS;
    const dt = new Date(ms);
    return { key: keyOf(ms), label: LABELS[dt.getUTCDay()], dayOfMonth: dt.getUTCDate() };
  });
  return {
    days,
    startUtc: localMidnight(startMs, tz).toISOString(),
    endUtc: localMidnight(startMs + 7 * DAY_MS, tz).toISOString(),
  };
}

export function groupByLocalDay(episodes: Episode[], tz: string): Record<string, Episode[]> {
  const out: Record<string, Episode[]> = {};
  const timed = episodes
    .filter((e): e is Episode & { airDateUtc: string } => !!e.airDateUtc && !Number.isNaN(new Date(e.airDateUtc).getTime()))
    .sort((a, b) => new Date(a.airDateUtc).getTime() - new Date(b.airDateUtc).getTime());
  for (const e of timed) (out[localDayKey(e.airDateUtc, tz)] ??= []).push(e);
  return out;
}
