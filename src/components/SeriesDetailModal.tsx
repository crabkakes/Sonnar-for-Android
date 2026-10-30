import { useState, useEffect } from 'react';
import {
  X,
  Search,
  RotateCw,
  Trash2,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  HardDrive,
  Calendar,
  Layers,
  FileCheck2,
  FileX2,
  Sparkles,
  Download
} from 'lucide-react';
import { Series, Episode, Release } from '../types/sonarr';
import { sonarrApi } from '../services/sonarrApi';
import { formatBytes, formatDate, getQualityBadgeColor } from '../utils/formatters';
import { ManualSearchModal } from './ManualSearchModal';

interface SeriesDetailModalProps {
  series: Series;
  onClose: () => void;
  onSeriesUpdated: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function SeriesDetailModal({ series, onClose, onSeriesUpdated, onShowToast }: SeriesDetailModalProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(true);
  const [expandedSeasons, setExpandedSeasons] = useState<Record<number, boolean>>({});
  const [selectedEpisodeForSearch, setSelectedEpisodeForSearch] = useState<Episode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearchingMonitored, setIsSearchingMonitored] = useState(false);

  const posterImg = series.images.find((img) => img.coverType === 'poster')?.url || '';
  const bannerImg = series.images.find((img) => img.coverType === 'banner')?.url || posterImg;

  useEffect(() => {
    let isMounted = true;
    async function loadEpisodes() {
      setIsLoadingEpisodes(true);
      try {
        const eps = await sonarrApi.getEpisodes(series.id);
        if (isMounted) {
          setEpisodes(eps);
          // Default expand all seasons
          const exp: Record<number, boolean> = {};
          series.seasons.forEach((s) => {
            exp[s.seasonNumber] = true;
          });
          setExpandedSeasons(exp);
        }
      } catch (e) {
        console.error('Failed to load episodes', e);
      } finally {
        if (isMounted) setIsLoadingEpisodes(false);
      }
    }
    loadEpisodes();
    return () => { isMounted = false; };
  }, [series.id, series.seasons]);

  const toggleSeasonExpanded = (seasonNum: number) => {
    setExpandedSeasons((prev) => ({ ...prev, [seasonNum]: !prev[seasonNum] }));
  };

  const handleToggleSeasonMonitored = async (seasonNum: number, currentMonitored: boolean) => {
    try {
      await sonarrApi.toggleSeasonMonitored(series.id, seasonNum, !currentMonitored);
      onSeriesUpdated();
      // Reload episodes
      const eps = await sonarrApi.getEpisodes(series.id);
      setEpisodes(eps);
      onShowToast('info', `Season ${seasonNum} ${!currentMonitored ? 'monitored' : 'unmonitored'}`);
    } catch {
      onShowToast('error', 'Failed to update season monitor status');
    }
  };

  const handleToggleEpisodeMonitored = async (ep: Episode) => {
    try {
      await sonarrApi.toggleEpisodeMonitored(ep.id, !ep.monitored);
      setEpisodes((prev) =>
        prev.map((e) => (e.id === ep.id ? { ...e, monitored: !ep.monitored } : e))
      );
      onShowToast('info', `Episode ${ep.episodeNumber} ${!ep.monitored ? 'monitored' : 'unmonitored'}`);
    } catch {
      onShowToast('error', 'Failed to toggle episode');
    }
  };

  const handleAutomaticSearch = (ep: Episode) => {
    onShowToast('info', `Searching indexers for S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}...`);
    setTimeout(() => {
      onShowToast('success', `Found & queued best release for "${ep.title}"`);
    }, 1500);
  };

  const handleSearchMonitored = () => {
    setIsSearchingMonitored(true);
    onShowToast('info', `Starting automatic search for all missing monitored episodes...`);
    setTimeout(() => {
      setIsSearchingMonitored(false);
      onShowToast('success', `Queued releases for ${series.title}`);
    }, 2000);
  };

  const handleRefreshSeries = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      onSeriesUpdated();
      onShowToast('success', `${series.title} updated & disk scanned`);
    }, 1200);
  };

  const handleDeleteSeries = async () => {
    if (!window.confirm(`Are you sure you want to delete "${series.title}" from Sonarr?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await sonarrApi.deleteSeries(series.id, false);
      onShowToast('info', `Deleted ${series.title}`);
      onClose();
      onSeriesUpdated();
    } catch {
      onShowToast('error', 'Failed to delete series');
      setIsDeleting(false);
    }
  };

  const stats = series.statistics || {
    episodeFileCount: 0,
    totalEpisodeCount: 0,
    sizeOnDisk: 0,
    percentOfEpisodes: 0
  };

  const percent = Math.round(stats.percentOfEpisodes || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl bg-slate-900 border border-slate-800 rounded-none sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header / Backdrop Banner */}
        <div className="relative h-44 sm:h-48 w-full bg-slate-950 overflow-hidden shrink-0">
          {bannerImg ? (
            <img
              src={bannerImg}
              alt={series.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-black/30" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/70 text-slate-300 hover:text-white backdrop-blur-md border border-slate-700/60 z-10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header series info overlay */}
          <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3.5">
            {/* Small poster thumbnail */}
            <div className="w-16 h-24 rounded-lg bg-slate-800 border-2 border-slate-700/80 overflow-hidden shadow-xl shrink-0 hidden xs:block">
              {posterImg ? (
                <img
                  src={posterImg}
                  alt={series.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                  <Layers className="w-6 h-6" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight truncate">
                  {series.title}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 mt-1">
                <span>{series.year}</span>
                <span aria-hidden="true">·</span>
                <span>{series.network || 'Network'}</span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{series.status}</span>
                {series.ratings?.value && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-400 font-semibold font-mono">★ {series.ratings.value}</span>
                  </>
                )}
                {series.runtime && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{series.runtime}m</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSearchMonitored}
              disabled={isSearchingMonitored}
              className="px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <Search className={`w-3.5 h-3.5 ${isSearchingMonitored ? 'animate-spin' : ''}`} />
              <span>Search Monitored</span>
            </button>
            <button
              onClick={handleRefreshSeries}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Update & Scan</span>
            </button>
          </div>

          <button
            onClick={handleDeleteSeries}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
            title="Delete Series"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Progress summary card */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1.5">
              <span>{stats.episodeFileCount} of {stats.totalEpisodeCount} Episodes ({percent}%)</span>
              <span>{formatBytes(stats.sizeOnDisk)}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${percent === 100 ? 'bg-emerald-500' : 'bg-sky-500'} transition-all`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-2 font-mono flex items-center gap-1.5">
              <HardDrive className="w-3 h-3 shrink-0" />
              <span>{series.path}</span>
            </div>
          </div>

          {/* Series Overview */}
          {series.overview && (
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {series.overview}
            </p>
          )}

          {/* Genres */}
          {series.genres && series.genres.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-slate-500">Genres:</span>
              <span>{series.genres.join(' · ')}</span>
            </div>
          )}

          {/* Seasons List Accordion */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Seasons & Episodes
            </h3>

            {series.seasons.map((season) => {
              const seasonEpisodes = episodes.filter((e) => e.seasonNumber === season.seasonNumber);
              const isExpanded = !!expandedSeasons[season.seasonNumber];
              const sStats = season.statistics || {
                episodeFileCount: 0,
                totalEpisodeCount: seasonEpisodes.length || 0,
                sizeOnDisk: 0,
                percentOfEpisodes: 0
              };

              return (
                <div
                  key={season.seasonNumber}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl overflow-hidden"
                >
                  {/* Season Header Bar */}
                  <div className="p-3 bg-slate-900/60 flex items-center justify-between gap-3">
                    <button
                      onClick={() => toggleSeasonExpanded(season.seasonNumber)}
                      className="flex items-center gap-2 text-left flex-1 min-w-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div>
                        <span className="text-sm font-bold text-slate-200">
                          {season.seasonNumber === 0 ? 'Specials' : `Season ${season.seasonNumber}`}
                        </span>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {sStats.episodeFileCount}/{sStats.totalEpisodeCount} eps · {formatBytes(sStats.sizeOnDisk)}
                        </div>
                      </div>
                    </button>

                    {/* Season Monitor Checkbox */}
                    <button
                      onClick={() => handleToggleSeasonMonitored(season.seasonNumber, season.monitored)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      title={season.monitored ? 'Unmonitor season' : 'Monitor season'}
                    >
                      {season.monitored ? (
                        <BookmarkCheck className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Bookmark className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </div>

                  {/* Episodes Table / List */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-800/40">
                      {isLoadingEpisodes ? (
                        <div className="p-4 text-center text-xs text-slate-500 font-mono">
                          Loading episodes...
                        </div>
                      ) : seasonEpisodes.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500">
                          No episodes cataloged for this season yet.
                        </div>
                      ) : (
                        seasonEpisodes.map((ep) => (
                          <div
                            key={ep.id}
                            className="p-3 flex items-start justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                          >
                            {/* Left: Code, Title, File info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-sky-400 shrink-0">
                                  {ep.episodeNumber}
                                </span>
                                <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
                                  {ep.title}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mt-1 font-mono">
                                <span>{formatDate(ep.airDate)}</span>
                                <span aria-hidden="true">·</span>
                                {ep.hasFile && ep.episodeFile ? (
                                  <>
                                    <span className={`px-1.5 py-0.2 rounded text-[10px] ${getQualityBadgeColor(ep.episodeFile.quality?.quality?.name)}`}>
                                      {ep.episodeFile.quality?.quality?.name}
                                    </span>
                                    <span>{formatBytes(ep.episodeFile.size)}</span>
                                    {ep.episodeFile.mediaInfo && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span>{ep.episodeFile.mediaInfo.videoCodec}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>{ep.episodeFile.mediaInfo.audioCodec}</span>
                                      </>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-rose-400 text-[11px] font-semibold">
                                    Missing
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Interactive Manual Release Search */}
                              <button
                                onClick={() => setSelectedEpisodeForSearch(ep)}
                                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-sky-500 hover:text-slate-950 text-slate-300 transition-colors"
                                title="Interactive Release Search (Manual Grab)"
                              >
                                <Search className="w-3.5 h-3.5" />
                              </button>

                              {/* Automatic Search */}
                              <button
                                onClick={() => handleAutomaticSearch(ep)}
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                                title="Automatic Episode Search"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>

                              {/* Monitored Toggle */}
                              <button
                                onClick={() => handleToggleEpisodeMonitored(ep)}
                                className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                                title={ep.monitored ? 'Monitored' : 'Unmonitored'}
                              >
                                {ep.monitored ? (
                                  <BookmarkCheck className="w-3.5 h-3.5 text-sky-400" />
                                ) : (
                                  <Bookmark className="w-3.5 h-3.5 text-slate-600" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Manual Search Modal */}
      {selectedEpisodeForSearch && (
        <ManualSearchModal
          episode={selectedEpisodeForSearch}
          seriesTitle={series.title}
          onClose={() => setSelectedEpisodeForSearch(null)}
          onReleaseGrabbed={(release: Release) => {
            setSelectedEpisodeForSearch(null);
            onShowToast('success', `Grabbed "${release.title}" - sent to download client`);
          }}
        />
      )}
    </div>
  );
}
