import type { Episode, HistoryItem, QueueItem, Release, Series } from '../api/types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

type SeriesSpec = {
  id: number;
  title: string;
  year: number;
  network: string;
  status: Series['status'];
  seasons: number;
  perSeason: number;
  /** Aired episodes without a file. */
  missing: number;
  hasImages: boolean;
  /** Days from now until the next episode airs (negative = aired already this week). */
  airsInDays?: number;
};

const SPECS: SeriesSpec[] = [
  { id: 1, title: 'Harbor Lights', year: 2022, network: 'Coastline', status: 'continuing', seasons: 3, perSeason: 8, missing: 3, hasImages: true, airsInDays: 1 },
  { id: 2, title: 'The Quiet Office', year: 2015, network: 'Northway', status: 'ended', seasons: 4, perSeason: 10, missing: 0, hasImages: true },
  { id: 3, title: 'Starfall', year: 2024, network: 'Orbit+', status: 'continuing', seasons: 1, perSeason: 10, missing: 1, hasImages: false, airsInDays: 2 },
  { id: 4, title: 'Copper Canyon', year: 2019, network: 'Frontier', status: 'continuing', seasons: 5, perSeason: 12, missing: 0, hasImages: true, airsInDays: 3 },
  { id: 5, title: 'Midnight Bakery', year: 2021, network: 'Sweetwater', status: 'continuing', seasons: 2, perSeason: 6, missing: 2, hasImages: true, airsInDays: 0 },
  { id: 6, title: 'Paper Lanterns', year: 2018, network: 'Eastlight', status: 'ended', seasons: 3, perSeason: 13, missing: 0, hasImages: true },
  { id: 7, title: 'Glass Orchard', year: 2026, network: 'Orbit+', status: 'upcoming', seasons: 1, perSeason: 8, missing: 0, hasImages: true },
];

export type Fixtures = {
  series: Series[];
  episodes: Record<number, Episode[]>;
  calendar: Episode[];
  queue: QueueItem[];
  history: HistoryItem[];
  releases: Release[];
};

const quality = (name: string) => ({ quality: { name } });

export function buildFixtures(now: Date): Fixtures {
  const t = now.getTime();
  const iso = (ms: number) => new Date(ms).toISOString();

  const series: Series[] = SPECS.map((s) => {
    const total = s.seasons * s.perSeason;
    const aired = s.status === 'upcoming' ? 0 : total - (s.status === 'continuing' ? Math.min(4, s.perSeason) : 0);
    const files = Math.max(0, aired - s.missing);
    return {
      id: s.id,
      title: s.title,
      sortTitle: s.title.toLowerCase().replace(/^the /, ''),
      year: s.year,
      network: s.network,
      status: s.status,
      monitored: s.status !== 'ended',
      qualityProfileId: 1,
      seriesType: 'standard',
      path: `/tv/${s.title}`,
      images: s.hasImages ? [{ coverType: 'poster' }] : [],
      seasons: Array.from({ length: s.seasons }, (_, i) => ({
        seasonNumber: i + 1,
        monitored: true,
      })),
      nextAiring: s.airsInDays === undefined ? undefined : iso(t + s.airsInDays * DAY),
      statistics: {
        episodeFileCount: files,
        episodeCount: aired,
        totalEpisodeCount: total,
        percentOfEpisodes: aired === 0 ? 0 : Math.round((files / aired) * 100),
        seasonCount: s.seasons,
      },
    };
  });

  const episodes: Record<number, Episode[]> = {};
  for (const [idx, s] of SPECS.entries()) {
    const list: Episode[] = [];
    const stats = series[idx].statistics!;
    let n = 0;
    for (let season = 1; season <= s.seasons; season++) {
      for (let e = 1; e <= s.perSeason; e++) {
        n++;
        const aired = n <= stats.episodeCount;
        // Files are the earliest aired episodes except the last `missing` ones.
        const hasFile = aired && n <= stats.episodeFileCount;
        list.push({
          id: s.id * 1000 + n,
          seriesId: s.id,
          seasonNumber: season,
          episodeNumber: e,
          title: `Episode ${n}`,
          airDateUtc: aired ? iso(t - (stats.episodeCount - n + 7) * DAY) : s.status === 'ended' ? undefined : iso(t + (n - stats.episodeCount) * 7 * DAY),
          hasFile,
          monitored: true,
          episodeFile: hasFile ? { quality: quality('WEBDL-1080p') } : undefined,
        });
      }
    }
    episodes[s.id] = list;
  }

  // Episodes airing around now: at least three distinct days on either side of today.
  const calendarSpec: [number, number][] = [
    [1, -2], [2, -1], [5, -1], [1, 0], [3, 1], [4, 1], [1, 2], [3, 3],
  ];
  const calendar: Episode[] = calendarSpec.map(([seriesId, days], i) => ({
    id: 90000 + i,
    seriesId,
    seasonNumber: 1,
    episodeNumber: 20 + i,
    title: `Calendar Episode ${i + 1}`,
    airDateUtc: iso(t + days * DAY + (days === 0 ? HOUR : 0)),
    hasFile: days < 0 && i % 2 === 0,
    monitored: true,
    series: series.find((s) => s.id === seriesId),
  }));

  const queue: QueueItem[] = [
    {
      id: 1,
      seriesId: 1,
      episodeId: 1001,
      title: 'Harbor.Lights.S01E02.1080p.WEB-DL',
      size: 2_400_000_000,
      sizeleft: 900_000_000,
      timeleft: '00:12:30',
      status: 'downloading',
      trackedDownloadStatus: 'ok',
      trackedDownloadState: 'downloading',
      quality: quality('WEBDL-1080p'),
      protocol: 'torrent',
      series: series[0],
      episode: episodes[1][1],
    },
    {
      id: 2,
      seriesId: 3,
      episodeId: 3002,
      title: 'Starfall.S01E02.720p.HDTV',
      size: 1_100_000_000,
      sizeleft: 1_050_000_000,
      status: 'warning',
      trackedDownloadStatus: 'warning',
      trackedDownloadState: 'downloading',
      statusMessages: [{ title: 'Starfall.S01E02.720p.HDTV', messages: ['The download is stalled with no connections'] }],
      quality: quality('HDTV-720p'),
      protocol: 'usenet',
      series: series[2],
      episode: episodes[3][1],
    },
  ];

  const history: HistoryItem[] = [
    { id: 1, eventType: 'downloadFolderImported', date: iso(t - 2 * HOUR), sourceTitle: 'Copper.Canyon.S05E11.1080p', seriesId: 4, episodeId: 4059, quality: quality('WEBDL-1080p'), series: series[3] },
    { id: 2, eventType: 'grabbed', date: iso(t - 5 * HOUR), sourceTitle: 'Harbor.Lights.S01E02.1080p.WEB-DL', seriesId: 1, episodeId: 1002, quality: quality('WEBDL-1080p'), series: series[0] },
    { id: 3, eventType: 'downloadFailed', date: iso(t - DAY), sourceTitle: 'Midnight.Bakery.S02E04.720p', seriesId: 5, episodeId: 5010, quality: quality('HDTV-720p'), series: series[4] },
  ];

  const rel = (
    n: number,
    title: string,
    name: string,
    resolution: number,
    protocol: Release['protocol'],
    sizeGb: number,
    rejections: string[] = [],
  ): Release => ({
    guid: `sample-release-${n}`,
    indexerId: (n % 3) + 1,
    indexer: ['NorthIndex', 'PaperTrail', 'OpenBeacon'][n % 3],
    title,
    size: Math.round(sizeGb * 1_000_000_000),
    ageHours: n * 7,
    quality: { quality: { name, resolution } },
    protocol,
    seeders: protocol === 'torrent' ? 40 - n * 3 : undefined,
    leechers: protocol === 'torrent' ? n : undefined,
    releaseGroup: ['LANTERN', 'ORCHID', 'HARBOR'][n % 3],
    languages: [{ name: 'English' }],
    rejected: rejections.length > 0,
    rejections,
  });
  const releases: Release[] = [
    rel(1, 'Show.S01E02.2160p.WEB-DL.DDP5.1.HDR', 'WEBDL-2160p', 2160, 'torrent', 6.8),
    rel(2, 'Show.S01E02.2160p.BluRay.REMUX', 'Remux-2160p', 2160, 'usenet', 14.2, ['Not an upgrade for existing episode file']),
    rel(3, 'Show.S01E02.1080p.WEB-DL.DDP5.1', 'WEBDL-1080p', 1080, 'torrent', 2.4),
    rel(4, 'Show.S01E02.1080p.WEB-DL.H264', 'WEBDL-1080p', 1080, 'usenet', 2.1),
    rel(5, 'Show.S01E02.1080p.HDTV.x264', 'HDTV-1080p', 1080, 'usenet', 1.6, ['Quality profile does not allow HDTV-1080p']),
    rel(6, 'Show.S01E02.720p.WEB-DL', 'WEBDL-720p', 720, 'torrent', 1.1),
    rel(7, 'Show.S01E02.720p.HDTV.x264', 'HDTV-720p', 720, 'usenet', 0.9),
    rel(8, 'Show.S01E02.480p.WEB-DL', 'WEBDL-480p', 480, 'torrent', 0.5, ['Release is older than the retention limit']),
    rel(9, 'Show.S01E02.1080p.AMZN.WEB-DL', 'WEBDL-1080p', 1080, 'torrent', 3.0),
    rel(10, 'Show.S01E02.2160p.HDTV', 'HDTV-2160p', 2160, 'usenet', 8.0),
  ];

  return { series, episodes, calendar, queue, history, releases };
}
