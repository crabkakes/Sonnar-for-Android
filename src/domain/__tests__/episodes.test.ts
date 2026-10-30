import type { Episode, Series } from '../../api/types';
import { episodeStatus, groupSeasons } from '../series';

const now = new Date('2026-10-30T12:00:00Z');
const ep = (extra: Partial<Episode> = {}): Episode => ({
  id: 1, seriesId: 1, seasonNumber: 1, episodeNumber: 1, airDateUtc: '2026-01-01T00:00:00Z', hasFile: false, monitored: true, ...extra,
});

describe('episodeStatus', () => {
  test('downloaded with quality', () =>
    expect(episodeStatus(ep({ hasFile: true, episodeFile: { quality: { quality: { name: 'WEBDL-1080p' } } } }), now)).toEqual({ kind: 'downloaded', quality: 'WEBDL-1080p' }));
  test('downloaded without file details', () => expect(episodeStatus(ep({ hasFile: true }), now)).toEqual({ kind: 'downloaded', quality: undefined }));
  test('missing when aired and monitored', () => expect(episodeStatus(ep(), now)).toEqual({ kind: 'missing' }));
  test('unmonitored when aired and not monitored', () => expect(episodeStatus(ep({ monitored: false }), now)).toEqual({ kind: 'unmonitored' }));
  test('unaired with date', () => expect(episodeStatus(ep({ airDateUtc: '2026-11-05T00:00:00Z' }), now)).toEqual({ kind: 'unaired', at: '2026-11-05T00:00:00Z' }));
  test('unaired TBA', () => expect(episodeStatus(ep({ airDateUtc: undefined }), now)).toEqual({ kind: 'unaired', at: undefined }));
});

describe('groupSeasons', () => {
  const series = { id: 1, seasons: [{ seasonNumber: 0, monitored: false }, { seasonNumber: 1, monitored: true }, { seasonNumber: 2, monitored: true }] } as Series;
  const eps = [
    ep({ id: 1, seasonNumber: 1, episodeNumber: 1, hasFile: true }),
    ep({ id: 2, seasonNumber: 1, episodeNumber: 2 }),
    ep({ id: 3, seasonNumber: 2, episodeNumber: 1 }),
    ep({ id: 4, seasonNumber: 0, episodeNumber: 1 }),
  ];
  const groups = groupSeasons(series, eps);

  test('newest first, specials last', () => expect(groups.map((g) => g.seasonNumber)).toEqual([2, 1, 0]));
  test('titles', () => expect(groups.map((g) => g.title)).toEqual(['Season 2', 'Season 1', 'Specials']));
  test('have/total and monitored', () => {
    expect(groups[1]).toMatchObject({ have: 1, total: 2, monitored: true });
    expect(groups[2]).toMatchObject({ have: 0, total: 1, monitored: false });
  });
  test('episodes descending', () => expect(groups[1].episodes.map((e) => e.episodeNumber)).toEqual([2, 1]));
  test('no episodes yet', () => expect(groupSeasons(series, []).map((g) => g.total)).toEqual([0, 0, 0]));
});
