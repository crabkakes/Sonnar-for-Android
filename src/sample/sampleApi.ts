import type { LookupSeries, Paged, SonarrApi } from '../api/types';
import { buildFixtures } from './fixtures';

const RELEASES_DELAY_MS = 800;

function page<T>(records: T[], p: number, pageSize: number): Paged<T> {
  const start = (p - 1) * pageSize;
  return { page: p, pageSize, totalRecords: records.length, records: records.slice(start, start + pageSize) };
}

/** Read-only API backed by fixtures. Mutations resolve and change nothing. */
export function createSampleApi(now: () => Date): SonarrApi {
  const f = buildFixtures(now());
  const resolved = async () => {};

  const lookupPool: LookupSeries[] = [
    ...f.series.map((s, i) => ({ ...s, id: s.id, tvdbId: 100 + i, overview: `${s.title} is a fictional sample show.` })),
    {
      title: 'Lantern Street',
      year: 2025,
      network: 'Eastlight',
      status: 'continuing',
      monitored: false,
      seriesType: 'standard',
      images: [],
      seasons: [{ seasonNumber: 1, monitored: true }],
      tvdbId: 999,
      overview: 'A fictional show you have not added yet.',
    },
  ];

  return {
    testConnection: async () => ({ appName: 'Sonarr', version: '4.0.0.0' }),
    getSeries: async () => f.series,
    getSeriesById: async (id) => {
      const s = f.series.find((x) => x.id === id);
      if (!s) throw new Error('Sample series not found');
      return s;
    },
    updateSeries: async (s) => s,
    deleteSeries: resolved,
    lookupSeries: async (term) => {
      const q = term.trim().toLowerCase();
      return lookupPool.filter((s) => s.title.toLowerCase().includes(q));
    },
    addSeries: async () => f.series[0],
    getRootFolders: async () => [{ id: 1, path: '/tv', freeSpace: 480_000_000_000 }],
    getQualityProfiles: async () => [
      { id: 1, name: 'HD - 1080p' },
      { id: 2, name: 'Ultra-HD' },
    ],
    getEpisodes: async (seriesId) => f.episodes[seriesId] ?? [],
    setEpisodesMonitored: resolved,
    getCalendar: async (startUtc, endUtc) => {
      const start = Date.parse(startUtc);
      const end = Date.parse(endUtc);
      return f.calendar.filter((e) => {
        const at = Date.parse(e.airDateUtc ?? '');
        return at >= start && at < end;
      });
    },
    getQueue: async (p, size) => page(f.queue, p, size),
    removeQueueItem: resolved,
    getHistory: async (p, size) => page(f.history, p, size),
    searchEpisodes: resolved,
    searchSeason: resolved,
    getReleases: (_q, signal) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(f.releases), RELEASES_DELAY_MS);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('aborted'));
        });
      }),
    grabRelease: resolved,
    posterSource: () => null,
  };
}
