import type { Release } from '../../api/types';
import { filterReleases, formatAge, resolutionChips, sortReleases } from '../releases';

const r = (guid: string, extra: Partial<Release> & { res?: number | null } = {}): Release => {
  const { res, ...rest } = extra;
  return {
    guid, indexerId: 1, title: guid, size: 100, protocol: 'torrent', rejected: false, rejections: [],
    quality: { quality: { name: 'Q', ...(res === null ? {} : { resolution: res ?? 1080 }) } },
    ...rest,
  };
};

describe('resolutionChips', () => {
  it('returns distinct resolutions ascending, skipping 0 and undefined', () => {
    const rs = [r('a', { res: 1080 }), r('b', { res: 720 }), r('c', { res: 1080 }), r('d', { res: 0 }), r('e', { res: null }), r('f', { res: 2160 })];
    expect(resolutionChips(rs)).toEqual([720, 1080, 2160]);
  });
  it('is empty for no releases', () => expect(resolutionChips([])).toEqual([]));
});

describe('filterReleases', () => {
  const rs = [r('a', { res: 1080 }), r('b', { res: 720, rejected: true }), r('c', { res: 1080, rejected: true })];
  it('keeps everything with no filters', () => {
    expect(filterReleases(rs, { hideRejected: false }).map((x) => x.guid)).toEqual(['a', 'b', 'c']);
  });
  it('hides rejected', () => {
    expect(filterReleases(rs, { hideRejected: true }).map((x) => x.guid)).toEqual(['a']);
  });
  it('filters by resolution', () => {
    expect(filterReleases(rs, { resolution: 1080, hideRejected: false }).map((x) => x.guid)).toEqual(['a', 'c']);
  });
  it('combines both', () => {
    expect(filterReleases(rs, { resolution: 720, hideRejected: true })).toEqual([]);
  });
});

describe('sortReleases', () => {
  const rs = [
    r('a', { size: 10, seeders: 5, ageHours: 30 }),
    r('b', { size: 30, seeders: undefined, ageHours: 10 }),
    r('c', { size: 20, seeders: 50, ageHours: undefined }),
    r('d', { size: 30, seeders: 5, ageHours: 10 }),
  ];
  const ids = (x: Release[]) => x.map((i) => i.guid);
  it('sonarr keeps input order and does not mutate', () => {
    expect(ids(sortReleases(rs, 'sonarr'))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(rs)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('size descending, stable', () => expect(ids(sortReleases(rs, 'size'))).toEqual(['b', 'd', 'c', 'a']));
  it('seeders descending, undefined last, stable', () => expect(ids(sortReleases(rs, 'seeders'))).toEqual(['c', 'a', 'd', 'b']));
  it('age ascending, undefined last, stable', () => expect(ids(sortReleases(rs, 'age'))).toEqual(['b', 'd', 'a', 'c']));
});

describe('formatAge', () => {
  it('formats hours, days, months and unknown', () => {
    expect([undefined, 0.2, 5, 50, 24 * 100].map(formatAge)).toEqual(['—', '<1 h', '5 h', '2 d', '3 mo']);
  });
});
