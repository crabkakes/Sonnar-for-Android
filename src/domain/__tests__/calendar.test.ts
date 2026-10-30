import type { Episode } from '../../api/types';
import { buildWeek, groupByLocalDay, localDayKey } from '../calendar';

const ep = (id: number, airDateUtc?: string): Episode =>
  ({ id, seriesId: 1, seasonNumber: 1, episodeNumber: id, airDateUtc, hasFile: false, monitored: true }) as Episode;

describe('calendar domain', () => {
  it('UTC early-morning airs on previous local day', () =>
    expect(localDayKey('2026-10-31T01:00:00Z', 'America/New_York')).toBe('2026-10-30'));

  it('week starts on device first weekday (Sunday)', () =>
    expect(buildWeek(new Date('2026-10-30T12:00:00Z'), 1, 'America/New_York').days.map((d) => d.key)).toEqual([
      '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31',
    ]));

  it('Monday start', () =>
    expect(buildWeek(new Date('2026-10-30T12:00:00Z'), 2, 'Europe/Berlin').days[0].key).toBe('2026-10-26'));

  it('labels and day numbers', () => {
    const w = buildWeek(new Date('2026-10-30T12:00:00Z'), 1, 'America/New_York');
    expect(w.days.map((d) => d.label).join('')).toBe('SMTWTFS');
    expect(w.days[0].dayOfMonth).toBe(25);
  });

  it('DST week still has 7 days and covers full local range', () => {
    const w = buildWeek(new Date('2026-11-03T12:00:00Z'), 1, 'America/New_York');
    expect(w.days).toHaveLength(7);
    expect(w.startUtc).toBe('2026-11-01T04:00:00.000Z');
    expect(w.endUtc).toBe('2026-11-08T05:00:00.000Z');
  });

  it('groups by local day sorted by air time and skips TBA', () => {
    const g = groupByLocalDay(
      [ep(1, '2026-10-30T23:00:00Z'), ep(2), ep(3, '2026-10-30T14:00:00Z')],
      'America/New_York',
    );
    expect(Object.keys(g)).toEqual(['2026-10-30']);
    expect(g['2026-10-30'].map((e) => e.id)).toEqual([3, 1]);
  });
});
