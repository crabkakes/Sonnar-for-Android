export type ConnectionConfig = { baseUrl: string; apiKey: string };

export type SystemStatus = { appName: string; version: string };

export type SeriesType = 'standard' | 'daily' | 'anime';
export type MonitorOption = 'all' | 'future' | 'missing' | 'existing' | 'pilot' | 'firstSeason' | 'none';

export type Image = { coverType: 'poster' | 'fanart' | 'banner'; remoteUrl?: string };

export type Season = {
  seasonNumber: number;
  monitored: boolean;
  statistics?: { episodeFileCount: number; episodeCount: number; totalEpisodeCount: number };
};

export type Series = {
  id: number;
  title: string;
  sortTitle?: string;
  year?: number;
  network?: string;
  status: 'continuing' | 'ended' | 'upcoming' | 'deleted';
  monitored: boolean;
  qualityProfileId: number;
  seriesType: SeriesType;
  path?: string;
  images: Image[];
  seasons: Season[];
  nextAiring?: string;
  statistics?: {
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    percentOfEpisodes: number;
    seasonCount: number;
  };
};

/** `id` is present when the series is already added. */
export type LookupSeries = Omit<Series, 'id' | 'qualityProfileId'> & {
  id?: number;
  tvdbId: number;
  remotePoster?: string;
  overview?: string;
};

export type Episode = {
  id: number;
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
  title?: string;
  airDateUtc?: string;
  hasFile: boolean;
  monitored: boolean;
  episodeFile?: { quality: { quality: { name: string } } };
  series?: Series;
};

export type RootFolder = { id: number; path: string; freeSpace?: number };
export type QualityProfile = { id: number; name: string };
export type Paged<T> = { page: number; pageSize: number; totalRecords: number; records: T[] };

export type QueueItem = {
  id: number;
  seriesId?: number;
  episodeId?: number;
  title: string;
  size?: number;
  sizeleft?: number;
  timeleft?: string;
  status: string;
  trackedDownloadStatus?: 'ok' | 'warning' | 'error';
  trackedDownloadState?: string;
  statusMessages?: { title: string; messages: string[] }[];
  errorMessage?: string;
  quality?: { quality: { name: string } };
  protocol?: 'usenet' | 'torrent';
  series?: Series;
  episode?: Episode;
};

export type HistoryItem = {
  id: number;
  eventType: string;
  date: string;
  sourceTitle: string;
  seriesId: number;
  episodeId: number;
  quality?: { quality: { name: string } };
  series?: Series;
  episode?: Episode;
};

export type Release = {
  guid: string;
  indexerId: number;
  indexer?: string;
  title: string;
  size: number;
  ageHours?: number;
  quality: { quality: { name: string; resolution?: number } };
  protocol: 'usenet' | 'torrent';
  seeders?: number;
  leechers?: number;
  releaseGroup?: string;
  languages?: { name: string }[];
  rejected: boolean;
  rejections: string[];
};

export type AddSeriesInput = {
  lookup: LookupSeries;
  rootFolderPath: string;
  qualityProfileId: number;
  monitor: MonitorOption;
  seriesType: SeriesType;
  searchForMissingEpisodes: boolean;
};

export interface SonarrApi {
  testConnection(): Promise<SystemStatus>;
  getSeries(): Promise<Series[]>;
  getSeriesById(id: number): Promise<Series>;
  updateSeries(s: Series): Promise<Series>;
  deleteSeries(id: number, deleteFiles: boolean): Promise<void>;
  lookupSeries(term: string): Promise<LookupSeries[]>;
  addSeries(input: AddSeriesInput): Promise<Series>;
  getRootFolders(): Promise<RootFolder[]>;
  getQualityProfiles(): Promise<QualityProfile[]>;
  getEpisodes(seriesId: number): Promise<Episode[]>;
  setEpisodesMonitored(ids: number[], monitored: boolean): Promise<void>;
  getCalendar(startUtc: string, endUtc: string): Promise<Episode[]>;
  getQueue(page: number, pageSize: number): Promise<Paged<QueueItem>>;
  removeQueueItem(id: number, opts: { blocklist: boolean; removeFromClient: boolean }): Promise<void>;
  getHistory(page: number, pageSize: number): Promise<Paged<HistoryItem>>;
  searchEpisodes(episodeIds: number[]): Promise<void>;
  searchSeason(seriesId: number, seasonNumber: number): Promise<void>;
  getReleases(
    q: { episodeId: number } | { seriesId: number; seasonNumber: number },
    signal?: AbortSignal,
  ): Promise<Release[]>;
  grabRelease(r: Pick<Release, 'guid' | 'indexerId'>): Promise<void>;
  posterSource(seriesId: number): { uri: string; headers?: Record<string, string> } | null;
}
