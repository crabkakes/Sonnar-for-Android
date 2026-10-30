import { Series, Episode, QueueItem, Release, HistoryItem, DiskSpace, QualityProfile, RootFolder, SystemStatus, HealthCheck } from '../types/sonarr';

export const INITIAL_SERIES: Series[] = [
  {
    id: 1,
    title: 'Synapse',
    sortTitle: 'synapse',
    status: 'continuing',
    overview: 'In a corporate espionage metropolis, a memory technician discovers encoded anomalies in high-ranking executives that lead to a suppressed reality layer.',
    network: 'Prism+',
    airTime: '21:00',
    images: [
      { coverType: 'poster', url: '/src/assets/images/poster_scifi_mystery_1793331840788.jpg' },
      { coverType: 'banner', url: '/src/assets/images/poster_scifi_mystery_1793331840788.jpg' }
    ],
    seasons: [
      {
        seasonNumber: 1,
        monitored: true,
        statistics: { episodeFileCount: 10, episodeCount: 10, totalEpisodeCount: 10, sizeOnDisk: 28400000000, percentOfEpisodes: 100 }
      },
      {
        seasonNumber: 2,
        monitored: true,
        statistics: { episodeFileCount: 4, episodeCount: 8, totalEpisodeCount: 8, sizeOnDisk: 12200000000, percentOfEpisodes: 50 }
      }
    ],
    year: 2024,
    path: '/data/media/tv/Synapse',
    qualityProfileId: 1,
    seasonFolder: true,
    monitored: true,
    runtime: 54,
    seriesType: 'standard',
    genres: ['Sci-Fi', 'Mystery', 'Thriller'],
    tags: [1, 3],
    ratings: { votes: 14200, value: 8.8 },
    statistics: {
      seasonCount: 2,
      episodeFileCount: 14,
      episodeCount: 18,
      totalEpisodeCount: 18,
      sizeOnDisk: 40600000000,
      percentOfEpisodes: 77.8
    },
    nextAiring: '2026-11-02T02:00:00Z',
    previousAiring: '2026-10-26T02:00:00Z'
  },
  {
    id: 2,
    title: "The Dragon's Burden",
    sortTitle: 'dragons burden',
    status: 'continuing',
    overview: 'An uneasy truce between rival noble houses fractures as ancient draconic lineages stir in the volcanic frostlands of Valdoria.',
    network: 'HBO Max',
    airTime: '20:00',
    images: [
      { coverType: 'poster', url: '/src/assets/images/poster_fantasy_throne_1793331842208.jpg' },
      { coverType: 'banner', url: '/src/assets/images/poster_fantasy_throne_1793331842208.jpg' }
    ],
    seasons: [
      {
        seasonNumber: 1,
        monitored: true,
        statistics: { episodeFileCount: 10, episodeCount: 10, totalEpisodeCount: 10, sizeOnDisk: 42000000000, percentOfEpisodes: 100 }
      },
      {
        seasonNumber: 2,
        monitored: true,
        statistics: { episodeFileCount: 8, episodeCount: 8, totalEpisodeCount: 8, sizeOnDisk: 38500000000, percentOfEpisodes: 100 }
      },
      {
        seasonNumber: 3,
        monitored: true,
        statistics: { episodeFileCount: 1, episodeCount: 10, totalEpisodeCount: 10, sizeOnDisk: 4800000000, percentOfEpisodes: 10 }
      }
    ],
    year: 2023,
    path: "/data/media/tv/The Dragon's Burden",
    qualityProfileId: 1,
    seasonFolder: true,
    monitored: true,
    runtime: 62,
    seriesType: 'standard',
    genres: ['Fantasy', 'Drama', 'Action'],
    tags: [1],
    ratings: { votes: 38900, value: 9.1 },
    statistics: {
      seasonCount: 3,
      episodeFileCount: 19,
      episodeCount: 28,
      totalEpisodeCount: 28,
      sizeOnDisk: 85300000000,
      percentOfEpisodes: 67.9
    },
    nextAiring: '2026-11-01T01:00:00Z',
    previousAiring: '2026-10-25T01:00:00Z'
  },
  {
    id: 3,
    title: 'Overgrowth',
    sortTitle: 'overgrowth',
    status: 'continuing',
    overview: 'Decades after the spore collapse, small outposts cling to brutalist towers now swallowed by carnivorous flora and bio-engineered wildlife.',
    network: 'Netflix',
    airTime: '00:01',
    images: [
      { coverType: 'poster', url: '/src/assets/images/poster_postapocalyptic_1793331842497.jpg' },
      { coverType: 'banner', url: '/src/assets/images/poster_postapocalyptic_1793331842497.jpg' }
    ],
    seasons: [
      {
        seasonNumber: 1,
        monitored: true,
        statistics: { episodeFileCount: 5, episodeCount: 8, totalEpisodeCount: 8, sizeOnDisk: 18200000000, percentOfEpisodes: 62.5 }
      }
    ],
    year: 2025,
    path: '/data/media/tv/Overgrowth',
    qualityProfileId: 2,
    seasonFolder: true,
    monitored: true,
    runtime: 50,
    seriesType: 'standard',
    genres: ['Sci-Fi', 'Survival', 'Horror'],
    tags: [2],
    ratings: { votes: 9400, value: 8.4 },
    statistics: {
      seasonCount: 1,
      episodeFileCount: 5,
      episodeCount: 8,
      totalEpisodeCount: 8,
      sizeOnDisk: 18200000000,
      percentOfEpisodes: 62.5
    },
    nextAiring: '2026-11-06T08:00:00Z',
    previousAiring: '2026-10-23T08:00:00Z'
  },
  {
    id: 4,
    title: 'Blood & Shogunate',
    sortTitle: 'blood and shogunate',
    status: 'continuing',
    overview: 'A gritty, politically charged chronicle of clan warfare in 16th century feudal Japan as a rogue samurai becomes the master tactician for an exiled clan.',
    network: 'HBO Max / FX',
    airTime: '22:00',
    images: [
      { coverType: 'poster', url: '/src/assets/images/poster_feudal_drama_1793331841270.jpg' },
      { coverType: 'banner', url: '/src/assets/images/poster_feudal_drama_1793331841270.jpg' }
    ],
    seasons: [
      {
        seasonNumber: 1,
        monitored: true,
        statistics: { episodeFileCount: 8, episodeCount: 10, totalEpisodeCount: 10, sizeOnDisk: 26500000000, percentOfEpisodes: 80 }
      }
    ],
    year: 2024,
    path: '/data/media/tv/Blood & Shogunate',
    qualityProfileId: 1,
    seasonFolder: true,
    monitored: true,
    runtime: 58,
    seriesType: 'standard',
    genres: ['Historical', 'Drama', 'War'],
    tags: [1, 4],
    ratings: { votes: 31200, value: 9.3 },
    statistics: {
      seasonCount: 1,
      episodeFileCount: 8,
      episodeCount: 10,
      totalEpisodeCount: 10,
      sizeOnDisk: 26500000000,
      percentOfEpisodes: 80.0
    },
    nextAiring: '2026-11-12T03:00:00Z',
    previousAiring: '2026-10-15T03:00:00Z'
  },
  {
    id: 5,
    title: 'Severance',
    sortTitle: 'severance',
    status: 'continuing',
    overview: 'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.',
    network: 'Apple TV+',
    airTime: '00:00',
    images: [
      { coverType: 'poster', url: '' },
      { coverType: 'banner', url: '' }
    ],
    seasons: [
      {
        seasonNumber: 1,
        monitored: true,
        statistics: { episodeFileCount: 9, episodeCount: 9, totalEpisodeCount: 9, sizeOnDisk: 24300000000, percentOfEpisodes: 100 }
      },
      {
        seasonNumber: 2,
        monitored: true,
        statistics: { episodeFileCount: 10, episodeCount: 10, totalEpisodeCount: 10, sizeOnDisk: 31200000000, percentOfEpisodes: 100 }
      }
    ],
    year: 2022,
    path: '/data/media/tv/Severance',
    qualityProfileId: 1,
    seasonFolder: true,
    monitored: true,
    runtime: 55,
    seriesType: 'standard',
    genres: ['Sci-Fi', 'Thriller', 'Mystery'],
    tags: [1],
    ratings: { votes: 85000, value: 8.7 },
    statistics: {
      seasonCount: 2,
      episodeFileCount: 19,
      episodeCount: 19,
      totalEpisodeCount: 19,
      sizeOnDisk: 55500000000,
      percentOfEpisodes: 100
    },
    nextAiring: undefined,
    previousAiring: '2026-03-21T00:00:00Z'
  },
  {
    id: 6,
    title: 'Arcane',
    sortTitle: 'arcane',
    status: 'ended',
    overview: 'Set in the utopian region of Piltover and the oppressed underground of Zaun, the story follows the origins of two iconic League champions.',
    network: 'Netflix',
    airTime: '00:00',
    images: [
      { coverType: 'poster', url: '' },
      { coverType: 'banner', url: '' }
    ],
    seasons: [
      {
        seasonNumber: 1,
        monitored: false,
        statistics: { episodeFileCount: 9, episodeCount: 9, totalEpisodeCount: 9, sizeOnDisk: 22000000000, percentOfEpisodes: 100 }
      },
      {
        seasonNumber: 2,
        monitored: false,
        statistics: { episodeFileCount: 9, episodeCount: 9, totalEpisodeCount: 9, sizeOnDisk: 26000000000, percentOfEpisodes: 100 }
      }
    ],
    year: 2021,
    path: '/data/media/tv/Arcane',
    qualityProfileId: 1,
    seasonFolder: true,
    monitored: false,
    runtime: 42,
    seriesType: 'anime',
    genres: ['Animation', 'Action', 'Sci-Fi'],
    tags: [2, 3],
    ratings: { votes: 120000, value: 9.0 },
    statistics: {
      seasonCount: 2,
      episodeFileCount: 18,
      episodeCount: 18,
      totalEpisodeCount: 18,
      sizeOnDisk: 48000000000,
      percentOfEpisodes: 100
    },
    nextAiring: undefined,
    previousAiring: '2024-11-23T08:00:00Z'
  }
];

export const INITIAL_EPISODES: Record<number, Episode[]> = {
  1: [
    {
      id: 101,
      seriesId: 1,
      seasonNumber: 1,
      episodeNumber: 1,
      title: 'Neural Drift',
      airDate: '2024-04-12',
      airDateUtc: '2024-04-12T02:00:00Z',
      overview: 'Markus awakens with traces of an unauthorized cognitive imprint from a dead client.',
      hasFile: true,
      monitored: true,
      episodeFile: {
        id: 501,
        seriesId: 1,
        seasonNumber: 1,
        relativePath: 'Season 01/Synapse - S01E01 - Neural Drift [WEBDL-1080p].mkv',
        path: '/data/media/tv/Synapse/Season 01/Synapse - S01E01 - Neural Drift [WEBDL-1080p].mkv',
        size: 2840000000,
        dateAdded: '2024-04-12T04:20:00Z',
        quality: { quality: { id: 7, name: 'WEBDL-1080p', resolution: 1080 }, revision: { version: 1, real: 0 } },
        mediaInfo: { audioChannels: 6, audioCodec: 'EAC3', videoCodec: 'x264' }
      }
    },
    {
      id: 102,
      seriesId: 1,
      seasonNumber: 1,
      episodeNumber: 2,
      title: 'The Sub-Layer',
      airDate: '2024-04-19',
      airDateUtc: '2024-04-19T02:00:00Z',
      overview: 'An illicit probe into sector 9 reveals encrypted neural architecture beneath the metro transit grid.',
      hasFile: true,
      monitored: true,
      episodeFile: {
        id: 502,
        seriesId: 1,
        seasonNumber: 1,
        relativePath: 'Season 01/Synapse - S01E02 - The Sub-Layer [WEBDL-1080p].mkv',
        path: '/data/media/tv/Synapse/Season 01/Synapse - S01E02 - The Sub-Layer [WEBDL-1080p].mkv',
        size: 2790000000,
        dateAdded: '2024-04-19T04:15:00Z',
        quality: { quality: { id: 7, name: 'WEBDL-1080p', resolution: 1080 }, revision: { version: 1, real: 0 } },
        mediaInfo: { audioChannels: 6, audioCodec: 'EAC3', videoCodec: 'x264' }
      }
    },
    {
      id: 111,
      seriesId: 1,
      seasonNumber: 2,
      episodeNumber: 1,
      title: 'Echo Chambers',
      airDate: '2026-10-12',
      airDateUtc: '2026-10-12T02:00:00Z',
      overview: 'Six months after the leak, the corporation rolls out an irreversible patch for civilian optics.',
      hasFile: true,
      monitored: true,
      episodeFile: {
        id: 511,
        seriesId: 1,
        seasonNumber: 2,
        relativePath: 'Season 02/Synapse - S02E01 - Echo Chambers [WEBRip-2160p HDR].mkv',
        path: '/data/media/tv/Synapse/Season 02/Synapse - S02E01 - Echo Chambers [WEBRip-2160p HDR].mkv',
        size: 5800000000,
        dateAdded: '2026-10-12T03:45:00Z',
        quality: { quality: { id: 19, name: 'WEBRip-2160p', resolution: 2160 }, revision: { version: 1, real: 0 } },
        mediaInfo: { audioChannels: 8, audioCodec: 'TrueHD Atmos', videoCodec: 'HEVC' }
      }
    },
    {
      id: 112,
      seriesId: 1,
      seasonNumber: 2,
      episodeNumber: 2,
      title: 'Glass Horizon',
      airDate: '2026-10-19',
      airDateUtc: '2026-10-19T02:00:00Z',
      overview: 'The resistance faction compromises the server farm on the highest observation deck.',
      hasFile: true,
      monitored: true,
      episodeFile: {
        id: 512,
        seriesId: 1,
        seasonNumber: 2,
        relativePath: 'Season 02/Synapse - S02E02 - Glass Horizon [WEBRip-2160p HDR].mkv',
        path: '/data/media/tv/Synapse/Season 02/Synapse - S02E02 - Glass Horizon [WEBRip-2160p HDR].mkv',
        size: 6400000000,
        dateAdded: '2026-10-19T03:30:00Z',
        quality: { quality: { id: 19, name: 'WEBRip-2160p', resolution: 2160 }, revision: { version: 1, real: 0 } },
        mediaInfo: { audioChannels: 8, audioCodec: 'TrueHD Atmos', videoCodec: 'HEVC' }
      }
    },
    {
      id: 113,
      seriesId: 1,
      seasonNumber: 2,
      episodeNumber: 3,
      title: 'Synaptic Cascade',
      airDate: '2026-10-26',
      airDateUtc: '2026-10-26T02:00:00Z',
      overview: 'A rogue AI routine begins altering the memories of all enrolled participants in real-time.',
      hasFile: false,
      monitored: true
    },
    {
      id: 114,
      seriesId: 1,
      seasonNumber: 2,
      episodeNumber: 4,
      title: 'Null State',
      airDate: '2026-11-02',
      airDateUtc: '2026-11-02T02:00:00Z',
      overview: 'Trapped between virtual backups, Markus faces the architect of the neural network.',
      hasFile: false,
      monitored: true
    }
  ],
  2: [
    {
      id: 201,
      seriesId: 2,
      seasonNumber: 3,
      episodeNumber: 1,
      title: 'The Ashen Crown',
      airDate: '2026-10-18',
      airDateUtc: '2026-10-18T01:00:00Z',
      overview: 'Lord Corvus assumes the Obsidian Throne amidst murmurs of rebellion from the coastal bastions.',
      hasFile: true,
      monitored: true,
      episodeFile: {
        id: 601,
        seriesId: 2,
        seasonNumber: 3,
        relativePath: "Season 03/The Dragon's Burden - S03E01 - The Ashen Crown [WEBDL-1080p].mkv",
        path: "/data/media/tv/The Dragon's Burden/Season 03/The Dragon's Burden - S03E01 - The Ashen Crown [WEBDL-1080p].mkv",
        size: 4800000000,
        dateAdded: '2026-10-18T03:10:00Z',
        quality: { quality: { id: 7, name: 'WEBDL-1080p', resolution: 1080 }, revision: { version: 1, real: 0 } },
        mediaInfo: { audioChannels: 6, audioCodec: 'EAC3', videoCodec: 'x264' }
      }
    },
    {
      id: 202,
      seriesId: 2,
      seasonNumber: 3,
      episodeNumber: 2,
      title: 'Breath of Fire',
      airDate: '2026-10-25',
      airDateUtc: '2026-10-25T01:00:00Z',
      overview: 'A sighting in the jagged peaks confirms the eldest beast has awakened from century-long slumber.',
      hasFile: false,
      monitored: true
    },
    {
      id: 203,
      seriesId: 2,
      seasonNumber: 3,
      episodeNumber: 3,
      title: 'Iron Fealty',
      airDate: '2026-11-01',
      airDateUtc: '2026-11-01T01:00:00Z',
      overview: 'Envoys from the Sun Kingdom arrive with an ultimatum written in royal seal.',
      hasFile: false,
      monitored: true
    }
  ],
  3: [
    {
      id: 305,
      seriesId: 3,
      seasonNumber: 1,
      episodeNumber: 5,
      title: 'Canopy Breach',
      airDate: '2026-10-16',
      airDateUtc: '2026-10-16T08:00:00Z',
      overview: 'The foraging squad is cut off on the 40th floor as aggressive root systems compromise structural pillars.',
      hasFile: true,
      monitored: true,
      episodeFile: {
        id: 705,
        seriesId: 3,
        seasonNumber: 1,
        relativePath: 'Season 01/Overgrowth - S01E05 - Canopy Breach [WEBRip-1080p].mkv',
        path: '/data/media/tv/Overgrowth/Season 01/Overgrowth - S01E05 - Canopy Breach [WEBRip-1080p].mkv',
        size: 3400000000,
        dateAdded: '2026-10-16T10:15:00Z',
        quality: { quality: { id: 7, name: 'WEBDL-1080p', resolution: 1080 }, revision: { version: 1, real: 0 } }
      }
    },
    {
      id: 306,
      seriesId: 3,
      seasonNumber: 1,
      episodeNumber: 6,
      title: 'Spore Tide',
      airDate: '2026-10-23',
      airDateUtc: '2026-10-23T08:00:00Z',
      overview: 'The seasonal blooming event transforms the lower levels into a bioluminescent labyrinth.',
      hasFile: false,
      monitored: true
    },
    {
      id: 307,
      seriesId: 3,
      seasonNumber: 1,
      episodeNumber: 7,
      title: 'Root Descent',
      airDate: '2026-10-30',
      airDateUtc: '2026-10-30T08:00:00Z',
      overview: 'Dr. Evelyn descends into the subterranean subway tunnels to retrieve the germination catalyst.',
      hasFile: false,
      monitored: true
    }
  ]
};

export const INITIAL_QUEUE: QueueItem[] = [
  {
    id: 1001,
    seriesId: 3,
    episodeId: 306,
    series: {
      id: 3,
      title: 'Overgrowth',
      images: [{ coverType: 'poster', url: '/src/assets/images/poster_postapocalyptic_1793331842497.jpg' }]
    },
    episode: {
      id: 306,
      title: 'Spore Tide',
      seasonNumber: 1,
      episodeNumber: 6
    },
    quality: {
      quality: { id: 7, name: 'WEBRip-1080p', resolution: 1080 },
      revision: { version: 1, real: 0 }
    },
    size: 2900000000,
    title: 'Overgrowth.S01E06.Spore.Tide.1080p.NF.WEBRip.DDP5.1.Atmos.x264-FLUX',
    sizeleft: 928000000,
    timeleft: '00:03:45',
    estimatedCompletionTime: '2026-10-30T03:52:00Z',
    status: 'downloading',
    trackedDownloadStatus: 'ok',
    downloadId: 'qbit-ovg-0106',
    protocol: 'torrent',
    downloadClient: 'qBittorrent',
    indexer: 'TorrentLeech',
    downloadSpeed: '18.4 MB/s',
    progressPercent: 68
  },
  {
    id: 1002,
    seriesId: 1,
    episodeId: 113,
    series: {
      id: 1,
      title: 'Synapse',
      images: [{ coverType: 'poster', url: '/src/assets/images/poster_scifi_mystery_1793331840788.jpg' }]
    },
    episode: {
      id: 113,
      title: 'Synaptic Cascade',
      seasonNumber: 2,
      episodeNumber: 3
    },
    quality: {
      quality: { id: 19, name: 'WEBRip-2160p', resolution: 2160 },
      revision: { version: 1, real: 0 }
    },
    size: 6800000000,
    title: 'Synapse.S02E03.Synaptic.Cascade.2160p.HDR.WEB-DL.DDP5.1.Atmos.H.265-NTb',
    sizeleft: 4624000000,
    timeleft: '00:09:12',
    estimatedCompletionTime: '2026-10-30T04:02:00Z',
    status: 'downloading',
    trackedDownloadStatus: 'ok',
    downloadId: 'sab-syn-0203',
    protocol: 'usenet',
    downloadClient: 'SABnzbd',
    indexer: 'NZBGeek',
    downloadSpeed: '28.2 MB/s',
    progressPercent: 32
  },
  {
    id: 1003,
    seriesId: 2,
    episodeId: 202,
    series: {
      id: 2,
      title: "The Dragon's Burden",
      images: [{ coverType: 'poster', url: '/src/assets/images/poster_fantasy_throne_1793331842208.jpg' }]
    },
    episode: {
      id: 202,
      title: 'Breath of Fire',
      seasonNumber: 3,
      episodeNumber: 2
    },
    quality: {
      quality: { id: 7, name: 'WEBDL-1080p', resolution: 1080 },
      revision: { version: 1, real: 0 }
    },
    size: 4400000000,
    title: 'The.Dragons.Burden.S03E02.1080p.HMAX.WEB-DL.DDP5.1.Atmos.x264-FLUX',
    sizeleft: 4400000000,
    timeleft: '--:--',
    status: 'queued',
    trackedDownloadStatus: 'ok',
    downloadId: 'qbit-db-0302',
    protocol: 'torrent',
    downloadClient: 'qBittorrent',
    indexer: 'PassThePopcorn',
    downloadSpeed: '0 KB/s',
    progressPercent: 0
  }
];

export const INITIAL_HISTORY: HistoryItem[] = [
  {
    id: 401,
    seriesId: 1,
    episodeId: 112,
    sourceTitle: 'Synapse.S02E02.Glass.Horizon.2160p.HDR.WEB-DL.DDP5.1.Atmos.H.265-NTb',
    quality: { quality: { id: 19, name: 'WEBRip-2160p' } },
    eventType: 'downloadFolderImported',
    date: '2026-10-19T03:30:15Z',
    seriesTitle: 'Synapse',
    episodeTitle: 'Glass Horizon',
    seasonNumber: 2,
    episodeNumber: 2
  },
  {
    id: 402,
    seriesId: 2,
    episodeId: 201,
    sourceTitle: 'The.Dragons.Burden.S03E01.1080p.HMAX.WEB-DL.DDP5.1.Atmos.x264-FLUX',
    quality: { quality: { id: 7, name: 'WEBDL-1080p' } },
    eventType: 'downloadFolderImported',
    date: '2026-10-18T03:10:04Z',
    seriesTitle: "The Dragon's Burden",
    episodeTitle: 'The Ashen Crown',
    seasonNumber: 3,
    episodeNumber: 1
  },
  {
    id: 403,
    seriesId: 3,
    episodeId: 306,
    sourceTitle: 'Overgrowth.S01E06.Spore.Tide.1080p.NF.WEBRip.DDP5.1.Atmos.x264-FLUX',
    quality: { quality: { id: 7, name: 'WEBRip-1080p' } },
    eventType: 'grabbed',
    date: '2026-10-23T08:05:22Z',
    seriesTitle: 'Overgrowth',
    episodeTitle: 'Spore Tide',
    seasonNumber: 1,
    episodeNumber: 6
  }
];

export const MOCK_RELEASES_BY_EPISODE: Record<number, Release[]> = {
  113: [
    {
      guid: 'syn-0203-rel1',
      title: 'Synapse.S02E03.Synaptic.Cascade.2160p.HDR.WEB-DL.DDP5.1.Atmos.H.265-NTb',
      quality: { quality: { id: 19, name: 'WEBRip-2160p', resolution: 2160 } },
      size: 6800000000,
      age: 3,
      ageHours: 4,
      indexer: 'NZBGeek',
      indexerId: 1,
      protocol: 'usenet',
      customFormatScore: 1200,
      approved: true
    },
    {
      guid: 'syn-0203-rel2',
      title: 'Synapse.S02E03.1080p.PRISM.WEB-DL.DDP5.1.H.264-CMRG',
      quality: { quality: { id: 7, name: 'WEBDL-1080p', resolution: 1080 } },
      size: 3200000000,
      age: 3,
      ageHours: 5,
      indexer: 'TorrentLeech',
      indexerId: 2,
      protocol: 'torrent',
      seeders: 142,
      leechers: 8,
      customFormatScore: 850,
      approved: true
    },
    {
      guid: 'syn-0203-rel3',
      title: 'Synapse.S02E03.720p.HDTV.x264-SYN',
      quality: { quality: { id: 5, name: 'HDTV-720p', resolution: 720 } },
      size: 1100000000,
      age: 3,
      ageHours: 6,
      indexer: '1337x',
      indexerId: 3,
      protocol: 'torrent',
      seeders: 45,
      leechers: 2,
      customFormatScore: -100,
      rejections: ['Quality is lower than minimum cutoff (1080p)'],
      approved: false
    }
  ],
  202: [
    {
      guid: 'db-0302-rel1',
      title: 'The.Dragons.Burden.S03E02.1080p.HMAX.WEB-DL.DDP5.1.Atmos.x264-FLUX',
      quality: { quality: { id: 7, name: 'WEBDL-1080p', resolution: 1080 } },
      size: 4400000000,
      age: 4,
      ageHours: 12,
      indexer: 'PassThePopcorn',
      indexerId: 4,
      protocol: 'torrent',
      seeders: 320,
      leechers: 14,
      customFormatScore: 1100,
      approved: true
    },
    {
      guid: 'db-0302-rel2',
      title: 'The.Dragons.Burden.S03E02.2160p.UHD.HDR.WEB-DL.TrueHD.7.1-FraMeSToR',
      quality: { quality: { id: 19, name: 'WEBRip-2160p', resolution: 2160 } },
      size: 9800000000,
      age: 4,
      ageHours: 11,
      indexer: 'NZBPlanet',
      indexerId: 5,
      protocol: 'usenet',
      customFormatScore: 1450,
      approved: true
    }
  ],
  307: [
    {
      guid: 'ovg-0107-rel1',
      title: 'Overgrowth.S01E07.Root.Descent.1080p.NF.WEB-DL.DDP5.1.x264-NTb',
      quality: { quality: { id: 7, name: 'WEBDL-1080p', resolution: 1080 } },
      size: 3600000000,
      age: 0,
      ageMinutes: 42,
      indexer: 'TorrentLeech',
      indexerId: 2,
      protocol: 'torrent',
      seeders: 210,
      leechers: 45,
      customFormatScore: 920,
      approved: true
    }
  ]
};

export const MOCK_DISK_SPACE: DiskSpace[] = [
  {
    id: 1,
    path: '/data/media/tv',
    label: 'Main Media Storage (NVMe Array)',
    freeSpace: 2640000000000, // 2.64 TB
    totalSpace: 8000000000000  // 8.0 TB
  },
  {
    id: 2,
    path: '/storage/nas/tv-archive',
    label: 'Synology NAS Cold Tier',
    freeSpace: 5120000000000, // 5.12 TB
    totalSpace: 16000000000000 // 16.0 TB
  }
];

export const MOCK_QUALITY_PROFILES: QualityProfile[] = [
  { id: 1, name: 'Ultra-HD (4K HDR)', cutoff: 19, upgradeAllowed: true },
  { id: 2, name: 'HD - 720p/1080p (Default)', cutoff: 7, upgradeAllowed: true },
  { id: 3, name: 'Any / Best Available', cutoff: 7, upgradeAllowed: false },
  { id: 4, name: 'Anime 1080p Dual Audio', cutoff: 7, upgradeAllowed: true }
];

export const MOCK_ROOT_FOLDERS: RootFolder[] = [
  { id: 1, path: '/data/media/tv', freeSpace: 2640000000000 },
  { id: 2, path: '/storage/nas/tv-archive', freeSpace: 5120000000000 }
];

export const MOCK_SYSTEM_STATUS: SystemStatus = {
  version: '4.0.12.2823',
  buildTime: '2026-09-14T18:22:10Z',
  isDebug: false,
  isProduction: true,
  isAdmin: true,
  isUserInteractive: false,
  appData: '/config',
  osName: 'Linux',
  osVersion: '6.6.32-generic-x86_64',
  isNetCore: true,
  sqliteVersion: '3.42.0',
  migrationVersion: 218,
  urlBase: '',
  runtimeVersion: '8.0.8',
  branch: 'main',
  authentication: 'forms'
};

export const MOCK_HEALTH_CHECKS: HealthCheck[] = [
  {
    id: 1,
    source: 'DownloadClientCheck',
    type: 'ok',
    message: 'qBittorrent and SABnzbd are responding within normal thresholds.'
  },
  {
    id: 2,
    source: 'IndexerCheck',
    type: 'ok',
    message: 'All 6 configured indexers operational.'
  },
  {
    id: 3,
    source: 'DiskSpaceCheck',
    type: 'ok',
    message: 'Storage volumes have greater than 20% free space remaining.'
  }
];

export const MOCK_LOOKUP_RESULTS: Partial<Series>[] = [
  {
    title: 'Severance',
    year: 2022,
    network: 'Apple TV+',
    overview: 'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.',
    ratings: { value: 8.7, votes: 85000 },
    genres: ['Sci-Fi', 'Thriller'],
    status: 'continuing',
    tvdbId: 371980
  },
  {
    title: 'The Last of Us',
    year: 2023,
    network: 'HBO',
    overview: 'After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl who may be humanity’s last hope.',
    ratings: { value: 8.8, votes: 240000 },
    genres: ['Drama', 'Action', 'Adventure'],
    status: 'continuing',
    tvdbId: 392256
  },
  {
    title: 'Fallout',
    year: 2024,
    network: 'Prime Video',
    overview: 'In a future, post-apocalyptic Los Angeles brought about by nuclear decimation, citizens must live in underground bunkers to protect themselves.',
    ratings: { value: 8.4, votes: 160000 },
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    status: 'continuing',
    tvdbId: 385810
  },
  {
    title: 'House of the Dragon',
    year: 2022,
    network: 'HBO Max',
    overview: 'An internal succession war within House Targaryen at the height of its power, 172 years before the birth of Daenerys Targaryen.',
    ratings: { value: 8.4, votes: 380000 },
    genres: ['Drama', 'Action', 'Fantasy'],
    status: 'continuing',
    tvdbId: 371572
  },
  {
    title: 'Stranger Things',
    year: 2016,
    network: 'Netflix',
    overview: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    ratings: { value: 8.7, votes: 1200000 },
    genres: ['Drama', 'Fantasy', 'Horror'],
    status: 'continuing',
    tvdbId: 305288
  }
];
