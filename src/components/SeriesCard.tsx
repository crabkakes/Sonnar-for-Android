import { useState } from 'react';
import { Bookmark, BookmarkCheck, ChevronRight, Tv } from 'lucide-react';
import { Series } from '../types/sonarr';

interface SeriesCardProps {
  series: Series;
  viewMode: 'poster' | 'banner' | 'table';
  onClick: () => void;
  onToggleMonitored: (e: React.MouseEvent) => void;
}

export function SeriesCard({ series, viewMode, onClick, onToggleMonitored }: SeriesCardProps) {
  const [imageError, setImageError] = useState(false);

  const posterImg = series.images.find((img) => img.coverType === 'poster')?.url || '';
  const bannerImg = series.images.find((img) => img.coverType === 'banner')?.url || posterImg;

  const stats = series.statistics || {
    episodeFileCount: 0,
    totalEpisodeCount: 0,
    percentOfEpisodes: 0
  };

  const percent = Math.round(stats.percentOfEpisodes || 0);

  // Status color for progress bar
  const getProgressColor = () => {
    if (percent === 100) return 'bg-emerald-500';
    if (percent > 0) return 'bg-sky-500';
    return 'bg-rose-500';
  };

  if (viewMode === 'table') {
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-3 p-3 bg-slate-900/60 hover:bg-slate-800/80 active:bg-slate-800 border border-slate-800/80 rounded-xl transition-all cursor-pointer min-h-[58px]"
      >
        {/* Poster Thumbnail */}
        <div className="w-10 h-14 bg-slate-800 rounded-md overflow-hidden shrink-0 relative flex items-center justify-center">
          {posterImg && !imageError ? (
            <img
              src={posterImg}
              alt={series.title}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <Tv className="w-5 h-5 text-slate-500" />
          )}
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${getProgressColor()}`} />
        </div>

        {/* Title & Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100 truncate">{series.title}</h3>
            {series.monitored && (
              <span className="text-[10px] text-sky-400 font-mono shrink-0">Monitored</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
            <span>{series.network || 'TV'}</span>
            <span aria-hidden="true">·</span>
            <span>{series.year}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{stats.episodeFileCount}/{stats.totalEpisodeCount} eps</span>
            <span aria-hidden="true">·</span>
            <span className={`font-mono ${percent === 100 ? 'text-emerald-400' : 'text-sky-400'}`}>{percent}%</span>
          </div>
        </div>

        {/* Right Arrow */}
        <div className="flex items-center gap-1 text-slate-400 shrink-0">
          <button
            onClick={onToggleMonitored}
            className="p-1.5 rounded-lg hover:bg-slate-700/60 transition-colors"
            aria-label="Toggle monitored"
          >
            {series.monitored ? (
              <BookmarkCheck className="w-4 h-4 text-sky-400" />
            ) : (
              <Bookmark className="w-4 h-4 text-slate-500" />
            )}
          </button>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    );
  }

  if (viewMode === 'banner') {
    return (
      <div
        onClick={onClick}
        className="group relative bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/80 rounded-2xl overflow-hidden cursor-pointer transition-all active:scale-[0.99] shadow-sm"
      >
        <div className="h-28 w-full bg-slate-800 relative overflow-hidden">
          {bannerImg && !imageError ? (
            <img
              src={bannerImg}
              alt={series.title}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-900 to-slate-800 flex items-center px-4">
              <Tv className="w-8 h-8 text-slate-600" />
            </div>
          )}
          {/* Gradient Scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

          {/* Top badging */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            <button
              onClick={onToggleMonitored}
              className="p-1.5 rounded-full bg-slate-950/70 backdrop-blur-md border border-slate-700/60 text-slate-200 hover:text-white"
            >
              {series.monitored ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-sky-400" />
              ) : (
                <Bookmark className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>

          {/* Bottom Title overlay */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight leading-tight drop-shadow-xs">
                {series.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-0.5">
                <span>{series.network || 'Series'}</span>
                <span aria-hidden="true">·</span>
                <span>{series.year}</span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{series.status}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-mono font-semibold text-slate-200">
                {stats.episodeFileCount}/{stats.totalEpisodeCount}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {percent}%
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Progress Line */}
        <div className="w-full bg-slate-800 h-1.5">
          <div
            className={`h-full ${getProgressColor()} transition-all`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  // Default: Poster Grid (Optimized for 2-column mobile and responsive 3-4 column tablet)
  return (
    <div
      onClick={onClick}
      className="group relative bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 rounded-2xl overflow-hidden cursor-pointer transition-all active:scale-[0.98] shadow-sm flex flex-col"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full bg-slate-800 overflow-hidden">
        {posterImg && !imageError ? (
          <img
            src={posterImg}
            alt={series.title}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-3 text-center">
            <Tv className="w-8 h-8 text-sky-400 mb-2 opacity-80" />
            <span className="text-xs font-bold text-slate-200 line-clamp-2 leading-tight">
              {series.title}
            </span>
          </div>
        )}

        {/* Top Floating Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto">
            <button
              onClick={onToggleMonitored}
              className="p-1.5 rounded-full bg-slate-950/75 backdrop-blur-md border border-slate-700/60 shadow-sm"
              aria-label="Toggle monitored"
            >
              {series.monitored ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-sky-400" />
              ) : (
                <Bookmark className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
          {series.status === 'continuing' && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-emerald-500/80 text-white backdrop-blur-md shadow-xs">
              Airing
            </span>
          )}
        </div>

        {/* Bottom Scrim with Episode Count & Percentage */}
        <div className="absolute bottom-0 left-0 right-0 p-2 pt-6 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent flex items-end justify-between">
          <div className="text-[11px] font-mono text-slate-200 drop-shadow-xs">
            {stats.episodeFileCount}/{stats.totalEpisodeCount} eps
          </div>
          <div className="text-[11px] font-mono font-bold text-sky-300 drop-shadow-xs">
            {percent}%
          </div>
        </div>

        {/* Progress Bar under poster image */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/80">
          <div
            className={`h-full ${getProgressColor()} transition-all`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Info Strip */}
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-slate-100 line-clamp-1 leading-tight group-hover:text-sky-400 transition-colors">
            {series.title}
          </h3>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
            <span>{series.year}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{series.network || 'TV'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
