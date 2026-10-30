import { seriesSummary } from '../series';
import { formatAirTime, formatBytes } from '../format';

const base = { statistics: { episodeFileCount: 14, episodeCount: 18, totalEpisodeCount: 20, percentOfEpisodes: 77.8, seasonCount: 2 }, status: 'continuing' } as any;
const now = new Date('2026-10-30T12:00:00Z');

test('missing wins', () => expect(seriesSummary(base, now)).toMatchObject({ counts: '14/18 episodes', status: { kind: 'missing', count: 4 }, progress: 14/18 }));
test('next airing when complete', () => expect(seriesSummary({ ...base, statistics: { ...base.statistics, episodeFileCount: 18 }, nextAiring: '2026-10-31T01:00:00Z' }, now).status).toEqual({ kind: 'next', at: '2026-10-31T01:00:00Z' }));
test('ended', () => expect(seriesSummary({ ...base, status: 'ended', statistics: { ...base.statistics, episodeFileCount: 18 } }, now).status).toEqual({ kind: 'ended' }));
test('no statistics', () => expect(seriesSummary({ status: 'continuing' } as any, now)).toEqual({ counts: '0/0 episodes', status: { kind: 'none' }, progress: 0 }));

describe('formatAirTime', () => {
  const tz = 'America/New_York';
  test('today', () => expect(formatAirTime('2026-10-31T01:00:00Z', now, tz)).toBe('Today 9:00 PM'));
  test('within a week', () => expect(formatAirTime('2026-11-03T01:00:00Z', now, tz)).toBe('Mon 8:00 PM'));
  test('later', () => expect(formatAirTime('2026-11-12T01:00:00Z', now, tz)).toBe('Nov 11'));
});

describe('formatBytes', () => {
  test('undefined', () => expect(formatBytes(undefined)).toBe('—'));
  test('gb', () => expect(formatBytes(3.2 * 1024 ** 3)).toBe('3.2 GB'));
  test('small', () => expect(formatBytes(512)).toBe('512 B'));
  test('mb', () => expect(formatBytes(5 * 1024 ** 2)).toBe('5.0 MB'));
});
