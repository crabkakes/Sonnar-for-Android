import type { SonarrApi } from '../src/api/types';

/** Every method is a jest.fn resolving a harmless empty value; override what a test cares about. */
export function createFakeApi(overrides: Partial<SonarrApi> = {}): jest.Mocked<SonarrApi> {
  const paged = { page: 1, pageSize: 50, totalRecords: 0, records: [] };
  const base = {
    testConnection: jest.fn(async () => ({ appName: 'Sonarr', version: '4.0.0.0' })),
    getSeries: jest.fn(async () => []),
    getSeriesById: jest.fn(),
    updateSeries: jest.fn(),
    deleteSeries: jest.fn(async () => {}),
    lookupSeries: jest.fn(async () => []),
    addSeries: jest.fn(),
    getRootFolders: jest.fn(async () => []),
    getQualityProfiles: jest.fn(async () => []),
    getEpisodes: jest.fn(async () => []),
    setEpisodesMonitored: jest.fn(async () => {}),
    getCalendar: jest.fn(async () => []),
    getQueue: jest.fn(async () => paged),
    removeQueueItem: jest.fn(async () => {}),
    getHistory: jest.fn(async () => paged),
    searchEpisodes: jest.fn(async () => {}),
    searchSeason: jest.fn(async () => {}),
    getReleases: jest.fn(async () => []),
    grabRelease: jest.fn(async () => {}),
    posterSource: jest.fn(() => null),
  };
  return { ...base, ...overrides } as unknown as jest.Mocked<SonarrApi>;
}
