import {
  Series,
  Episode,
  QueueItem,
  Release,
  HistoryItem,
  DiskSpace,
  QualityProfile,
  RootFolder,
  SystemStatus,
  HealthCheck,
  SonarrConfig
} from '../types/sonarr';
import {
  INITIAL_SERIES,
  INITIAL_EPISODES,
  INITIAL_QUEUE,
  INITIAL_HISTORY,
  MOCK_RELEASES_BY_EPISODE,
  MOCK_DISK_SPACE,
  MOCK_QUALITY_PROFILES,
  MOCK_ROOT_FOLDERS,
  MOCK_SYSTEM_STATUS,
  MOCK_HEALTH_CHECKS,
  MOCK_LOOKUP_RESULTS
} from '../data/mockData';

const STORAGE_KEYS = {
  CONFIG: 'sonarr_mobile_config',
  SERIES: 'sonarr_mobile_series',
  EPISODES: 'sonarr_mobile_episodes',
  QUEUE: 'sonarr_mobile_queue',
  HISTORY: 'sonarr_mobile_history'
};

export const DEFAULT_CONFIG: SonarrConfig = {
  hostUrl: 'http://localhost:8989',
  apiKey: '',
  useProxy: true,
  demoMode: true
};

class SonarrApiService {
  private config: SonarrConfig;

  constructor() {
    this.config = this.loadConfig();
    this.initSimulatedStorage();
  }

  public getConfig(): SonarrConfig {
    return { ...this.config };
  }

  public saveConfig(newConfig: Partial<SonarrConfig>): void {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
    } catch (e) {
      console.warn('Failed to save Sonarr config to localStorage', e);
    }
  }

  private loadConfig(): SonarrConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_CONFIG;
  }

  public resetDemoData(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SERIES, JSON.stringify(INITIAL_SERIES));
      localStorage.setItem(STORAGE_KEYS.EPISODES, JSON.stringify(INITIAL_EPISODES));
      localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(INITIAL_QUEUE));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(INITIAL_HISTORY));
    } catch (e) {
      console.warn('Failed to reset demo data', e);
    }
  }

  private initSimulatedStorage(): void {
    try {
      if (!localStorage.getItem(STORAGE_KEYS.SERIES)) {
        localStorage.setItem(STORAGE_KEYS.SERIES, JSON.stringify(INITIAL_SERIES));
      }
      if (!localStorage.getItem(STORAGE_KEYS.EPISODES)) {
        localStorage.setItem(STORAGE_KEYS.EPISODES, JSON.stringify(INITIAL_EPISODES));
      }
      if (!localStorage.getItem(STORAGE_KEYS.QUEUE)) {
        localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(INITIAL_QUEUE));
      }
      if (!localStorage.getItem(STORAGE_KEYS.HISTORY)) {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(INITIAL_HISTORY));
      }
    } catch {
      // localStorage may not be available in strict sandboxes
    }
  }

  private getSimulatedSeries(): Series[] {
    try {
      const item = localStorage.getItem(STORAGE_KEYS.SERIES);
      return item ? JSON.parse(item) : INITIAL_SERIES;
    } catch {
      return INITIAL_SERIES;
    }
  }

  private saveSimulatedSeries(series: Series[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SERIES, JSON.stringify(series));
    } catch (e) {
      console.warn('Error saving series', e);
    }
  }

  private getSimulatedEpisodes(): Record<number, Episode[]> {
    try {
      const item = localStorage.getItem(STORAGE_KEYS.EPISODES);
      return item ? JSON.parse(item) : INITIAL_EPISODES;
    } catch {
      return INITIAL_EPISODES;
    }
  }

  private saveSimulatedEpisodes(episodes: Record<number, Episode[]>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.EPISODES, JSON.stringify(episodes));
    } catch (e) {
      console.warn('Error saving episodes', e);
    }
  }

  private getSimulatedQueue(): QueueItem[] {
    try {
      const item = localStorage.getItem(STORAGE_KEYS.QUEUE);
      return item ? JSON.parse(item) : INITIAL_QUEUE;
    } catch {
      return INITIAL_QUEUE;
    }
  }

  private saveSimulatedQueue(queue: QueueItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.warn('Error saving queue', e);
    }
  }

  private getSimulatedHistory(): HistoryItem[] {
    try {
      const item = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return item ? JSON.parse(item) : INITIAL_HISTORY;
    } catch {
      return INITIAL_HISTORY;
    }
  }

  private saveSimulatedHistory(history: HistoryItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      console.warn('Error saving history', e);
    }
  }

  // Real HTTP request via CORS proxy or direct
  private async request<T>(endpoint: string, method: string = 'GET', bodyData?: unknown): Promise<T> {
    const cleanHost = this.config.hostUrl.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const targetUrl = `${cleanHost}${cleanEndpoint}`;

    if (this.config.useProxy) {
      const proxyUrl = `/api/sonarr/proxy?url=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl, {
        method: method === 'GET' ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
        },
        body: method !== 'GET' ? JSON.stringify({ method, data: bodyData, apiKey: this.config.apiKey }) : undefined
      });

      if (!response.ok) {
        let errMessage = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson.details || errJson.error) {
            errMessage = errJson.details || errJson.error;
          }
        } catch {
          // fallback to text
        }
        throw new Error(errMessage);
      }
      return (await response.json()) as T;
    } else {
      const response = await fetch(targetUrl, {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Api-Key': this.config.apiKey
        },
        body: bodyData ? JSON.stringify(bodyData) : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as T;
    }
  }

  // Test real Sonarr server connection
  public async testConnection(hostUrl: string, apiKey: string, useProxy: boolean = true): Promise<{ success: boolean; version?: string; message: string }> {
    try {
      const cleanHost = hostUrl.replace(/\/+$/, '');
      const targetUrl = `${cleanHost}/api/v3/system/status`;

      if (useProxy) {
        const proxyUrl = `/api/sonarr/proxy?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyUrl, {
          method: 'GET',
          headers: { 'x-api-key': apiKey }
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { success: false, message: err.details || err.error || `HTTP ${res.status}` };
        }
        const data = await res.json();
        return { success: true, version: data.version, message: `Connected to Sonarr v${data.version}` };
      } else {
        const res = await fetch(targetUrl, {
          headers: { 'X-Api-Key': apiKey, 'Accept': 'application/json' }
        });
        if (!res.ok) {
          return { success: false, message: `Server returned HTTP ${res.status}` };
        }
        const data = await res.json();
        return { success: true, version: data.version, message: `Connected to Sonarr v${data.version}` };
      }
    } catch (err: unknown) {
      const error = err as Error;
      return { success: false, message: error.message || 'Failed to reach Sonarr instance' };
    }
  }

  // Series methods
  public async getSeries(): Promise<Series[]> {
    if (!this.config.demoMode && this.config.apiKey) {
      return this.request<Series[]>('/api/v3/series');
    }
    return this.getSimulatedSeries();
  }

  public async getSeriesById(id: number): Promise<Series> {
    if (!this.config.demoMode && this.config.apiKey) {
      return this.request<Series>(`/api/v3/series/${id}`);
    }
    const all = this.getSimulatedSeries();
    const found = all.find((s) => s.id === id);
    if (!found) throw new Error(`Series with ID ${id} not found`);
    return found;
  }

  public async addSeries(options: {
    tvdbId?: number;
    title: string;
    rootFolderPath: string;
    qualityProfileId: number;
    monitored: boolean;
    seasonFolder: boolean;
    seriesType: 'standard' | 'daily' | 'anime';
    searchForMissingEpisodes?: boolean;
    overview?: string;
    year?: number;
    network?: string;
    genres?: string[];
  }): Promise<Series> {
    if (!this.config.demoMode && this.config.apiKey) {
      return this.request<Series>('/api/v3/series', 'POST', {
        title: options.title,
        tvdbId: options.tvdbId,
        qualityProfileId: options.qualityProfileId,
        rootFolderPath: options.rootFolderPath,
        monitored: options.monitored,
        seasonFolder: options.seasonFolder,
        seriesType: options.seriesType,
        addOptions: {
          searchForMissingEpisodes: options.searchForMissingEpisodes ?? true
        }
      });
    }

    // Simulated Add
    const seriesList = this.getSimulatedSeries();
    const newId = Date.now();
    const newSeries: Series = {
      id: newId,
      title: options.title,
      sortTitle: options.title.toLowerCase(),
      status: 'continuing',
      overview: options.overview || 'Added via Sonarr Android Client.',
      network: options.network || 'Streaming',
      year: options.year || new Date().getFullYear(),
      path: `${options.rootFolderPath}/${options.title}`,
      qualityProfileId: options.qualityProfileId,
      seasonFolder: options.seasonFolder,
      monitored: options.monitored,
      runtime: 50,
      seriesType: options.seriesType,
      genres: options.genres || ['Drama'],
      tags: [],
      images: [
        { coverType: 'poster', url: '' },
        { coverType: 'banner', url: '' }
      ],
      seasons: [
        {
          seasonNumber: 1,
          monitored: true,
          statistics: { episodeFileCount: 0, episodeCount: 8, totalEpisodeCount: 8, sizeOnDisk: 0, percentOfEpisodes: 0 }
        }
      ],
      statistics: {
        seasonCount: 1,
        episodeFileCount: 0,
        episodeCount: 8,
        totalEpisodeCount: 8,
        sizeOnDisk: 0,
        percentOfEpisodes: 0
      }
    };

    seriesList.unshift(newSeries);
    this.saveSimulatedSeries(seriesList);

    // Create episodes for this new show
    const episodes = this.getSimulatedEpisodes();
    episodes[newId] = Array.from({ length: 8 }, (_, i) => ({
      id: newId * 100 + (i + 1),
      seriesId: newId,
      seasonNumber: 1,
      episodeNumber: i + 1,
      title: `Episode ${i + 1}`,
      airDate: '2026-10-01',
      overview: `Episode ${i + 1} synopsis for ${options.title}.`,
      hasFile: false,
      monitored: options.monitored
    }));
    this.saveSimulatedEpisodes(episodes);

    // If search for missing episodes requested, add an active queue item!
    if (options.searchForMissingEpisodes) {
      const queue = this.getSimulatedQueue();
      queue.unshift({
        id: Date.now() + 10,
        seriesId: newId,
        episodeId: newId * 100 + 1,
        series: { id: newId, title: options.title, images: newSeries.images },
        episode: { id: newId * 100 + 1, title: 'Episode 1', seasonNumber: 1, episodeNumber: 1 },
        quality: { quality: { id: 7, name: 'WEBDL-1080p', resolution: 1080 } },
        size: 3100000000,
        title: `${options.title.replace(/\s+/g, '.')}.S01E01.1080p.WEB-DL.DDP5.1.x264-FLUX`,
        sizeleft: 2900000000,
        timeleft: '00:08:24',
        status: 'downloading',
        trackedDownloadStatus: 'ok',
        downloadId: `sim-${Date.now()}`,
        protocol: 'torrent',
        downloadClient: 'qBittorrent',
        indexer: 'TorrentLeech',
        downloadSpeed: '16.5 MB/s',
        progressPercent: 6
      });
      this.saveSimulatedQueue(queue);
    }

    return newSeries;
  }

  public async deleteSeries(id: number, deleteFiles: boolean = false): Promise<void> {
    if (!this.config.demoMode && this.config.apiKey) {
      await this.request(`/api/v3/series/${id}?deleteFiles=${deleteFiles}`, 'DELETE');
      return;
    }
    const seriesList = this.getSimulatedSeries().filter((s) => s.id !== id);
    this.saveSimulatedSeries(seriesList);

    const episodes = this.getSimulatedEpisodes();
    delete episodes[id];
    this.saveSimulatedEpisodes(episodes);
  }

  public async toggleSeriesMonitored(id: number, monitored: boolean): Promise<Series> {
    if (!this.config.demoMode && this.config.apiKey) {
      const s = await this.getSeriesById(id);
      return this.request<Series>(`/api/v3/series/${id}`, 'PUT', { ...s, monitored });
    }
    const seriesList = this.getSimulatedSeries();
    const item = seriesList.find((s) => s.id === id);
    if (item) {
      item.monitored = monitored;
      this.saveSimulatedSeries(seriesList);
      return item;
    }
    throw new Error('Series not found');
  }

  // Episodes methods
  public async getEpisodes(seriesId: number): Promise<Episode[]> {
    if (!this.config.demoMode && this.config.apiKey) {
      return this.request<Episode[]>(`/api/v3/episode?seriesId=${seriesId}`);
    }
    const all = this.getSimulatedEpisodes();
    return all[seriesId] || [];
  }

  public async toggleEpisodeMonitored(episodeId: number, monitored: boolean): Promise<Episode> {
    if (!this.config.demoMode && this.config.apiKey) {
      const ep = await this.request<Episode>(`/api/v3/episode/${episodeId}`);
      return this.request<Episode>(`/api/v3/episode/${episodeId}`, 'PUT', { ...ep, monitored });
    }
    const all = this.getSimulatedEpisodes();
    for (const sId in all) {
      const ep = all[sId].find((e) => e.id === episodeId);
      if (ep) {
        ep.monitored = monitored;
        this.saveSimulatedEpisodes(all);
        return ep;
      }
    }
    throw new Error('Episode not found');
  }

  public async toggleSeasonMonitored(seriesId: number, seasonNumber: number, monitored: boolean): Promise<void> {
    if (!this.config.demoMode && this.config.apiKey) {
      const s = await this.getSeriesById(seriesId);
      const updatedSeasons = s.seasons.map((sn) =>
        sn.seasonNumber === seasonNumber ? { ...sn, monitored } : sn
      );
      await this.request(`/api/v3/series/${seriesId}`, 'PUT', { ...s, seasons: updatedSeasons });
      return;
    }
    const seriesList = this.getSimulatedSeries();
    const s = seriesList.find((item) => item.id === seriesId);
    if (s) {
      s.seasons = s.seasons.map((sn) =>
        sn.seasonNumber === seasonNumber ? { ...sn, monitored } : sn
      );
      this.saveSimulatedSeries(seriesList);

      // also toggle monitored state of child episodes in that season
      const episodes = this.getSimulatedEpisodes();
      if (episodes[seriesId]) {
        episodes[seriesId] = episodes[seriesId].map((ep) =>
          ep.seasonNumber === seasonNumber ? { ...ep, monitored } : ep
        );
        this.saveSimulatedEpisodes(episodes);
      }
    }
  }

  // Search releases & grab
  public async searchEpisodeReleases(episodeId: number): Promise<Release[]> {
    if (!this.config.demoMode && this.config.apiKey) {
      return this.request<Release[]>(`/api/v3/release?episodeId=${episodeId}`);
    }
    return MOCK_RELEASES_BY_EPISODE[episodeId] || [
      {
        guid: `rel-${episodeId}-1`,
        title: `Episode.Release.${episodeId}.1080p.WEB-DL.DDP5.1.x264`,
        quality: { quality: { id: 7, name: 'WEBDL-1080p', resolution: 1080 } },
        size: 3100000000,
        age: 1,
        ageHours: 2,
        indexer: 'TorrentLeech',
        indexerId: 2,
        protocol: 'torrent',
        seeders: 85,
        leechers: 4,
        customFormatScore: 900,
        approved: true
      },
      {
        guid: `rel-${episodeId}-2`,
        title: `Episode.Release.${episodeId}.2160p.UHD.HDR.H.265`,
        quality: { quality: { id: 19, name: 'WEBRip-2160p', resolution: 2160 } },
        size: 7200000000,
        age: 1,
        ageHours: 3,
        indexer: 'NZBGeek',
        indexerId: 1,
        protocol: 'usenet',
        customFormatScore: 1350,
        approved: true
      }
    ];
  }

  public async grabRelease(release: Release, seriesTitle?: string, episodeTitle?: string, seriesId?: number, episodeId?: number): Promise<void> {
    if (!this.config.demoMode && this.config.apiKey) {
      await this.request('/api/v3/release', 'POST', {
        guid: release.guid,
        indexerId: release.indexerId,
        downloadUrl: release.downloadUrl,
        title: release.title
      });
      return;
    }

    // Simulated grab -> add to queue
    const queue = this.getSimulatedQueue();
    const newQueueItem: QueueItem = {
      id: Date.now(),
      seriesId: seriesId || 1,
      episodeId: episodeId || 101,
      series: { id: seriesId || 1, title: seriesTitle || 'TV Series' },
      episode: { id: episodeId || 101, title: episodeTitle || 'Episode', seasonNumber: 1, episodeNumber: 1 },
      quality: release.quality,
      size: release.size,
      title: release.title,
      sizeleft: release.size,
      timeleft: '00:06:30',
      status: 'downloading',
      trackedDownloadStatus: 'ok',
      downloadId: `grab-${Date.now()}`,
      protocol: release.protocol,
      downloadClient: release.protocol === 'usenet' ? 'SABnzbd' : 'qBittorrent',
      indexer: release.indexer,
      downloadSpeed: release.protocol === 'usenet' ? '24.5 MB/s' : '15.2 MB/s',
      progressPercent: 5
    };

    queue.unshift(newQueueItem);
    this.saveSimulatedQueue(queue);

    // Add to history
    const history = this.getSimulatedHistory();
    history.unshift({
      id: Date.now(),
      seriesId: seriesId || 1,
      episodeId: episodeId || 101,
      sourceTitle: release.title,
      quality: { quality: { id: release.quality.quality.id, name: release.quality.quality.name } },
      eventType: 'grabbed',
      date: new Date().toISOString(),
      seriesTitle: seriesTitle || 'TV Series',
      episodeTitle: episodeTitle || 'Episode',
      seasonNumber: 1,
      episodeNumber: 1
    });
    this.saveSimulatedHistory(history);
  }

  // Activity / Queue
  public async getQueue(): Promise<QueueItem[]> {
    if (!this.config.demoMode && this.config.apiKey) {
      const data = await this.request<{ records?: QueueItem[] } | QueueItem[]>('/api/v3/queue?page=1&pageSize=50&includeUnknownSeriesItems=true&includeSeries=true&includeEpisode=true');
      if (Array.isArray(data)) return data;
      return data.records || [];
    }

    // In simulated mode, slightly increment active downloading progress to give authentic live feel
    const queue = this.getSimulatedQueue();
    let updated = false;
    for (const item of queue) {
      if (item.status === 'downloading' && item.progressPercent !== undefined && item.progressPercent < 98) {
        item.progressPercent = Math.min(99, item.progressPercent + 2);
        if (item.size && item.sizeleft) {
          item.sizeleft = Math.max(0, Math.floor(item.size * (1 - item.progressPercent / 100)));
        }
        updated = true;
      }
    }
    if (updated) {
      this.saveSimulatedQueue(queue);
    }
    return queue;
  }

  public async deleteQueueItem(id: number, removeFromClient: boolean = true, blocklist: boolean = false): Promise<void> {
    if (!this.config.demoMode && this.config.apiKey) {
      await this.request(`/api/v3/queue/${id}?removeFromClient=${removeFromClient}&blocklist=${blocklist}`, 'DELETE');
      return;
    }
    const queue = this.getSimulatedQueue().filter((q) => q.id !== id);
    this.saveSimulatedQueue(queue);
  }

  public async togglePauseQueueItem(id: number): Promise<void> {
    const queue = this.getSimulatedQueue();
    const item = queue.find((q) => q.id === id);
    if (item) {
      if (item.status === 'downloading') {
        item.status = 'paused';
        item.downloadSpeed = '0 KB/s';
      } else if (item.status === 'paused') {
        item.status = 'downloading';
        item.downloadSpeed = item.protocol === 'usenet' ? '25.0 MB/s' : '17.5 MB/s';
      }
      this.saveSimulatedQueue(queue);
    }
  }

  public async getHistory(page: number = 1, pageSize: number = 20): Promise<HistoryItem[]> {
    if (!this.config.demoMode && this.config.apiKey) {
      const res = await this.request<{ records?: HistoryItem[] } | HistoryItem[]>(`/api/v3/history?page=${page}&pageSize=${pageSize}&sortKey=date&sortDirection=descending`);
      if (Array.isArray(res)) return res;
      return res.records || [];
    }
    return this.getSimulatedHistory();
  }

  // Lookup series (Add Series search)
  public async lookupSeries(term: string): Promise<Partial<Series>[]> {
    if (!term || term.trim().length === 0) return [];

    if (!this.config.demoMode && this.config.apiKey) {
      return this.request<Partial<Series>[]>(`/api/v3/series/lookup?term=${encodeURIComponent(term)}`);
    }

    const t = term.toLowerCase();
    const matched = MOCK_LOOKUP_RESULTS.filter((r) =>
      r.title?.toLowerCase().includes(t) || r.overview?.toLowerCase().includes(t)
    );

    if (matched.length > 0) return matched;

    // Generic dynamic fallback so any searched title works
    return [
      {
        title: term.trim(),
        year: 2026,
        network: 'Streaming Network',
        overview: `A thrilling new series exploring modern events surrounding ${term.trim()}.`,
        ratings: { value: 8.2, votes: 4500 },
        genres: ['Drama', 'Thriller'],
        status: 'continuing',
        tvdbId: Math.floor(Math.random() * 900000 + 100000)
      }
    ];
  }

  // Calendar
  public async getCalendar(start: string, end: string): Promise<Episode[]> {
    if (!this.config.demoMode && this.config.apiKey) {
      return this.request<Episode[]>(`/api/v3/calendar?start=${start}&end=${end}&includeSeries=true`);
    }
    // Return all episodes from simulated series with series info attached
    const seriesList = this.getSimulatedSeries();
    const allEpisodes = this.getSimulatedEpisodes();
    const results: Episode[] = [];

    for (const s of seriesList) {
      const eps = allEpisodes[s.id] || [];
      for (const ep of eps) {
        if (ep.airDateUtc) {
          results.push({
            ...ep,
            series: s
          });
        }
      }
    }
    return results;
  }

  // System & Metadata
  public async getDiskSpace(): Promise<DiskSpace[]> {
    if (!this.config.demoMode && this.config.apiKey) {
      return this.request<DiskSpace[]>('/api/v3/diskspace');
    }
    return MOCK_DISK_SPACE;
  }

  public async getQualityProfiles(): Promise<QualityProfile[]> {
    if (!this.config.demoMode && this.config.apiKey) {
      return this.request<QualityProfile[]>('/api/v3/qualityprofile');
    }
    return MOCK_QUALITY_PROFILES;
  }

  public async getRootFolders(): Promise<RootFolder[]> {
    if (!this.config.demoMode && this.config.apiKey) {
      return this.request<RootFolder[]>('/api/v3/rootfolder');
    }
    return MOCK_ROOT_FOLDERS;
  }

  public async getSystemStatus(): Promise<SystemStatus> {
    if (!this.config.demoMode && this.config.apiKey) {
      return this.request<SystemStatus>('/api/v3/system/status');
    }
    return MOCK_SYSTEM_STATUS;
  }

  public async getHealth(): Promise<HealthCheck[]> {
    if (!this.config.demoMode && this.config.apiKey) {
      return this.request<HealthCheck[]>('/api/v3/health');
    }
    return MOCK_HEALTH_CHECKS;
  }
}

export const sonarrApi = new SonarrApiService();
