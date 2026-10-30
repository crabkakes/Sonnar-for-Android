import { SonarrError } from './errors';
import type { ConnectionConfig, SonarrApi, SystemStatus } from './types';

type Query = Record<string, string | number | boolean | undefined>;
type RequestInit_ = { method?: string; query?: Query; body?: unknown; timeoutMs?: number; signal?: AbortSignal };

const DEFAULT_TIMEOUT_MS = 15000;

export function createLiveApi(config: ConnectionConfig, fetchImpl: typeof fetch = fetch): SonarrApi {
  const baseUrl = config.baseUrl;
  const apiKey = config.apiKey.trim();
  const https = baseUrl.toLowerCase().startsWith('https://');

  async function request<T>(path: string, init: RequestInit_ = {}): Promise<T> {
    const { method = 'GET', query, body, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = init;
    const qs = Object.entries(query ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    const url = `${baseUrl}/api/v3${path}${qs ? `?${qs}` : ''}`;

    const headers: Record<string, string> = { 'X-Api-Key': apiKey, Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const controller = new AbortController();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new SonarrError('timeout', { https }));
      }, timeoutMs);
    });

    const work = (async () => {
      let res: Response;
      try {
        res = await fetchImpl(url, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
      } catch {
        throw new SonarrError('unreachable', { https });
      }
      if (res.status === 401 || res.status === 403) throw new SonarrError('unauthorized');
      if (!res.ok) throw new SonarrError('http', { status: res.status });
      if (res.status === 204) return undefined as T;
      let text: string;
      try {
        text = await res.text();
      } catch {
        throw new SonarrError('unreachable', { https });
      }
      if (!text.trim()) return undefined as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new SonarrError('not-sonarr');
      }
    })();

    try {
      return await Promise.race([work, timeout]);
    } finally {
      clearTimeout(timer);
      work.catch(() => {}); // avoid unhandled rejection if the timeout won
    }
  }

  const SEARCH_TIMEOUT_MS = 120000;

  return {
    async testConnection(): Promise<SystemStatus> {
      let data: { appName?: unknown; version?: unknown } | undefined;
      try {
        data = await request('/system/status');
      } catch (e) {
        if (e instanceof SonarrError && e.kind === 'http' && e.status === 404) {
          throw new SonarrError('not-sonarr');
        }
        throw e;
      }
      if (!data || typeof data !== 'object' || data.appName !== 'Sonarr' || typeof data.version !== 'string') {
        throw new SonarrError('not-sonarr');
      }
      const major = parseInt(data.version.split('.')[0], 10);
      if (major !== 3 && major !== 4) throw new SonarrError('unsupported-version');
      return { appName: data.appName, version: data.version };
    },

    getSeries: () => request('/series'),
    getSeriesById: (id) => request(`/series/${id}`),
    updateSeries: (s) => request(`/series/${s.id}`, { method: 'PUT', body: s }),
    deleteSeries: (id, deleteFiles) =>
      request(`/series/${id}`, { method: 'DELETE', query: { deleteFiles } }),
    lookupSeries: (term) => request('/series/lookup', { query: { term } }),
    addSeries: (input) =>
      request('/series', {
        method: 'POST',
        body: {
          ...input.lookup,
          rootFolderPath: input.rootFolderPath,
          qualityProfileId: input.qualityProfileId,
          seriesType: input.seriesType,
          monitored: input.monitor !== 'none',
          seasonFolder: true,
          addOptions: { monitor: input.monitor, searchForMissingEpisodes: input.searchForMissingEpisodes },
        },
      }),
    getRootFolders: () => request('/rootfolder'),
    getQualityProfiles: () => request('/qualityprofile'),
    getEpisodes: (seriesId) =>
      request('/episode', { query: { seriesId, includeEpisodeFile: true } }),
    setEpisodesMonitored: (ids, monitored) =>
      request('/episode/monitor', { method: 'PUT', body: { episodeIds: ids, monitored } }),
    getCalendar: (start, end) =>
      request('/calendar', { query: { start, end, includeSeries: true, unmonitored: false } }),
    getQueue: (page, pageSize) =>
      request('/queue', { query: { page, pageSize, includeSeries: true, includeEpisode: true } }),
    removeQueueItem: (id, { blocklist, removeFromClient }) =>
      request(`/queue/${id}`, { method: 'DELETE', query: { removeFromClient, blocklist } }),
    getHistory: (page, pageSize) =>
      request('/history', {
        query: {
          page,
          pageSize,
          sortKey: 'date',
          sortDirection: 'descending',
          includeSeries: true,
          includeEpisode: true,
        },
      }),
    searchEpisodes: (episodeIds) =>
      request('/command', { method: 'POST', body: { name: 'EpisodeSearch', episodeIds } }),
    searchSeason: (seriesId, seasonNumber) =>
      request('/command', { method: 'POST', body: { name: 'SeasonSearch', seriesId, seasonNumber } }),
    getReleases: (q, signal) =>
      request('/release', {
        query: 'episodeId' in q ? { episodeId: q.episodeId } : { seriesId: q.seriesId, seasonNumber: q.seasonNumber },
        timeoutMs: SEARCH_TIMEOUT_MS,
        signal,
      }),
    grabRelease: (r) =>
      request('/release', { method: 'POST', body: { guid: r.guid, indexerId: r.indexerId } }),
    posterSource: (seriesId) => ({
      uri: `${baseUrl}/api/v3/mediacover/${seriesId}/poster-250.jpg`,
      headers: { 'X-Api-Key': apiKey },
    }),
  };
}
