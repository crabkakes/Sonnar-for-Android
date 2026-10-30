export interface SeriesImage {
  coverType: 'poster' | 'banner' | 'fanart' | 'headshot';
  url?: string;
  remoteUrl?: string;
}

export interface SeasonStatistics {
  episodeFileCount: number;
  episodeCount: number;
  totalEpisodeCount: number;
  sizeOnDisk: number;
  percentOfEpisodes: number;
}

export interface Season {
  seasonNumber: number;
  monitored: boolean;
  statistics?: SeasonStatistics;
}

export interface SeriesStatistics {
  seasonCount: number;
  episodeFileCount: number;
  episodeCount: number;
  totalEpisodeCount: number;
  sizeOnDisk: number;
  percentOfEpisodes: number;
}

export interface Series {
  id: number;
  title: string;
  sortTitle?: string;
  status: 'continuing' | 'ended' | 'upcoming' | 'deleted';
  overview: string;
  network?: string;
  airTime?: string;
  images: SeriesImage[];
  seasons: Season[];
  year: number;
  path: string;
  profileId?: number;
  qualityProfileId: number;
  languageProfileId?: number;
  seasonFolder: boolean;
  monitored: boolean;
  useSceneNumbering?: boolean;
  runtime?: number;
  tvdbId?: number;
  tvRageId?: number;
  tvMazeId?: number;
  firstAired?: string;
  seriesType: 'standard' | 'daily' | 'anime';
  cleanTitle?: string;
  imdbId?: string;
  titleSlug?: string;
  genres?: string[];
  tags: number[];
  added?: string;
  ratings?: {
    votes: number;
    value: number;
  };
  statistics?: SeriesStatistics;
  nextAiring?: string;
  previousAiring?: string;
}

export interface MediaInfo {
  audioChannels: number;
  audioCodec: string;
  videoCodec: string;
}

export interface EpisodeFile {
  id: number;
  seriesId: number;
  seasonNumber: number;
  relativePath: string;
  path: string;
  size: number;
  dateAdded: string;
  quality: {
    quality: {
      id: number;
      name: string;
      resolution: number;
    };
    revision: {
      version: number;
      real: number;
    };
  };
  mediaInfo?: MediaInfo;
}

export interface Episode {
  id: number;
  seriesId: number;
  tvdbId?: number;
  episodeFileId?: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate?: string;
  airDateUtc?: string;
  overview?: string;
  hasFile: boolean;
  monitored: boolean;
  unverifiedSceneNumbering?: boolean;
  episodeFile?: EpisodeFile;
  series?: Partial<Series>;
}

export interface QueueItem {
  id: number;
  seriesId: number;
  episodeId: number;
  series?: {
    id: number;
    title: string;
    images?: SeriesImage[];
  };
  episode?: {
    id: number;
    title: string;
    seasonNumber: number;
    episodeNumber: number;
  };
  quality: {
    quality: {
      id: number;
      name: string;
      resolution: number;
    };
    revision?: {
      version: number;
      real: number;
    };
  };
  size: number;
  title: string;
  sizeleft: number;
  timeleft: string;
  estimatedCompletionTime?: string;
  status: 'downloading' | 'queued' | 'paused' | 'completed' | 'warning' | 'delay';
  trackedDownloadStatus?: 'ok' | 'warning' | 'error';
  statusMessages?: { title: string; messages: string[] }[];
  downloadId: string;
  protocol: 'torrent' | 'usenet';
  downloadClient: string;
  indexer: string;
  outputPath?: string;
  downloadSpeed?: string;
  progressPercent?: number;
}

export interface Release {
  guid: string;
  quality: {
    quality: {
      id: number;
      name: string;
      resolution: number;
    };
  };
  age: number;
  ageHours?: number;
  ageMinutes?: number;
  size: number;
  indexerId: number;
  indexer: string;
  title: string;
  downloadUrl?: string;
  seeders?: number;
  leechers?: number;
  protocol: 'torrent' | 'usenet';
  customFormatScore?: number;
  rejections?: string[];
  approved: boolean;
  publishDate?: string;
}

export interface HistoryItem {
  id: number;
  episodeId: number;
  seriesId: number;
  sourceTitle: string;
  quality: {
    quality: {
      id: number;
      name: string;
    };
  };
  eventType: 'grabbed' | 'downloadFolderImported' | 'downloadFailed' | 'episodeFileDeleted';
  date: string;
  seriesTitle: string;
  episodeTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  data?: Record<string, string>;
}

export interface DiskSpace {
  id: number;
  path: string;
  label: string;
  freeSpace: number;
  totalSpace: number;
}

export interface QualityProfile {
  id: number;
  name: string;
  cutoff: number;
  upgradeAllowed?: boolean;
}

export interface RootFolder {
  id: number;
  path: string;
  freeSpace: number;
  unmappedFolders?: { name: string; path: string }[];
}

export interface SystemStatus {
  version: string;
  buildTime?: string;
  isDebug: boolean;
  isProduction: boolean;
  isAdmin: boolean;
  isUserInteractive: boolean;
  startupPath?: string;
  appData?: string;
  osName: string;
  osVersion?: string;
  isNetCore: boolean;
  sqliteVersion?: string;
  migrationVersion?: number;
  urlBase: string;
  runtimeVersion?: string;
  branch: string;
  authentication: string;
}

export interface HealthCheck {
  id: number;
  source: string;
  type: 'ok' | 'notice' | 'warning' | 'error';
  message: string;
  wikiUrl?: string;
}

export interface SonarrConfig {
  hostUrl: string;
  apiKey: string;
  useProxy: boolean;
  demoMode: boolean;
}
