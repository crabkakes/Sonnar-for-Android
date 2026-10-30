import { useState, useEffect } from 'react';
import { X, Download, ShieldCheck, AlertTriangle, ArrowUpDown, Loader2 } from 'lucide-react';
import { Episode, Release } from '../types/sonarr';
import { sonarrApi } from '../services/sonarrApi';
import { formatBytes, getQualityBadgeColor } from '../utils/formatters';

interface ManualSearchModalProps {
  episode: Episode;
  seriesTitle: string;
  onClose: () => void;
  onReleaseGrabbed: (release: Release) => void;
}

export function ManualSearchModal({ episode, seriesTitle, onClose, onReleaseGrabbed }: ManualSearchModalProps) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [grabbingGuid, setGrabbingGuid] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'score' | 'size' | 'seeders' | 'age'>('score');

  useEffect(() => {
    let isMounted = true;
    async function fetchReleases() {
      setIsLoading(true);
      try {
        const results = await sonarrApi.searchEpisodeReleases(episode.id);
        if (isMounted) {
          setReleases(results);
        }
      } catch (e) {
        console.error('Failed to search releases', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchReleases();
    return () => { isMounted = false; };
  }, [episode.id]);

  const sortedReleases = [...releases].sort((a, b) => {
    if (sortKey === 'score') {
      return (b.customFormatScore || 0) - (a.customFormatScore || 0);
    }
    if (sortKey === 'size') {
      return b.size - a.size;
    }
    if (sortKey === 'seeders') {
      return (b.seeders || 0) - (a.seeders || 0);
    }
    if (sortKey === 'age') {
      return (a.age || 0) - (b.age || 0);
    }
    return 0;
  });

  const handleGrab = async (release: Release) => {
    setGrabbingGuid(release.guid);
    try {
      await sonarrApi.grabRelease(release, seriesTitle, episode.title, episode.seriesId, episode.id);
      onReleaseGrabbed(release);
    } catch (e) {
      console.error('Failed to grab release', e);
    } finally {
      setGrabbingGuid(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full sm:max-w-2xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="text-[11px] font-mono text-sky-400 uppercase tracking-wider font-semibold">
              Interactive Search
            </div>
            <h2 className="text-base font-bold text-slate-100 truncate">
              {seriesTitle} · S{String(episode.seasonNumber).padStart(2, '0')}E{String(episode.episodeNumber).padStart(2, '0')}
            </h2>
            <div className="text-xs text-slate-400 truncate mt-0.5">
              "{episode.title}"
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sorting Bar */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 font-mono">
            {releases.length} releases found
          </span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 text-[11px] flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> Sort:
            </span>
            <button
              onClick={() => setSortKey('score')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                sortKey === 'score' ? 'bg-sky-500/20 text-sky-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Score
            </button>
            <button
              onClick={() => setSortKey('size')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                sortKey === 'size' ? 'bg-sky-500/20 text-sky-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Size
            </button>
            <button
              onClick={() => setSortKey('seeders')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                sortKey === 'seeders' ? 'bg-sky-500/20 text-sky-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Peers
            </button>
          </div>
        </div>

        {/* Releases Body List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 divide-y divide-slate-800/50">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
              <span className="text-xs">Querying indexers for {episode.title}...</span>
            </div>
          ) : sortedReleases.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              No releases found for this episode on configured indexers.
            </div>
          ) : (
            sortedReleases.map((release) => {
              const isGrabbing = grabbingGuid === release.guid;
              const hasRejection = release.rejections && release.rejections.length > 0;

              return (
                <div key={release.guid} className="pt-3 first:pt-0 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-medium text-slate-100 break-all leading-snug">
                        {release.title}
                      </div>

                      {/* Metadata row */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mt-1.5 font-mono">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] ${getQualityBadgeColor(release.quality?.quality?.name)}`}>
                          {release.quality?.quality?.name || 'HD'}
                        </span>
                        <span>{formatBytes(release.size)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{release.indexer}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{release.protocol}</span>
                        {release.protocol === 'torrent' && release.seeders !== undefined && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-400">{release.seeders} seeds</span>
                          </>
                        )}
                        {release.customFormatScore !== undefined && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-sky-300">Score: {release.customFormatScore}</span>
                          </>
                        )}
                      </div>

                      {/* Rejections warning */}
                      {hasRejection && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{release.rejections?.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Grab CTA Button */}
                    <button
                      onClick={() => handleGrab(release)}
                      disabled={isGrabbing}
                      className="px-3 py-2 bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-transform shadow-xs"
                      title="Grab release and send to download client"
                    >
                      {isGrabbing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>Grab</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
