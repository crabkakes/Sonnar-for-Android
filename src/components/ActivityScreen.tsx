import { useState, useEffect } from 'react';
import {
  Download,
  Clock,
  History,
  Pause,
  Play,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileDown,
  RotateCw,
  HardDrive,
  Radio,
  Server,
  ShieldAlert,
  Loader2,
  Tv
} from 'lucide-react';
import { QueueItem, HistoryItem } from '../types/sonarr';
import { sonarrApi } from '../services/sonarrApi';
import { formatBytes, formatDate, formatTime, getQualityBadgeColor } from '../utils/formatters';

interface ActivityScreenProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onQueueUpdated?: () => void;
}

export function ActivityScreen({ onShowToast, onQueueUpdated }: ActivityScreenProps) {
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QueueItem | null>(null);
  const [blocklistOnDelete, setBlocklistOnDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchActivityData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [queueData, historyData] = await Promise.all([
        sonarrApi.getQueue(),
        sonarrApi.getHistory()
      ]);
      setQueue(queueData);
      setHistory(historyData);
      if (onQueueUpdated) onQueueUpdated();
    } catch (e) {
      console.error('Failed to load activity', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivityData();
    // Live update poll every 3 seconds for active downloads
    const interval = setInterval(() => {
      fetchActivityData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleTogglePause = async (item: QueueItem) => {
    try {
      await sonarrApi.togglePauseQueueItem(item.id);
      fetchActivityData(true);
      onShowToast('info', `${item.status === 'downloading' ? 'Paused' : 'Resumed'} download`);
    } catch {
      onShowToast('error', 'Failed to toggle download state');
    }
  };

  const confirmDeleteQueue = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await sonarrApi.deleteQueueItem(deleteTarget.id, true, blocklistOnDelete);
      setDeleteTarget(null);
      setBlocklistOnDelete(false);
      fetchActivityData(true);
      onShowToast('info', `Removed from download client${blocklistOnDelete ? ' & added to blocklist' : ''}`);
    } catch {
      onShowToast('error', 'Failed to remove download');
    } finally {
      setIsDeleting(false);
    }
  };

  // Status badge styling
  const getStatusBadge = (status: QueueItem['status']) => {
    switch (status) {
      case 'downloading':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono text-sky-400 font-semibold bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>
            Downloading
          </span>
        );
      case 'queued':
        return (
          <span className="text-[11px] font-mono text-amber-300 font-medium bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full">
            Queued
          </span>
        );
      case 'paused':
        return (
          <span className="text-[11px] font-mono text-slate-400 font-medium bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
            Paused
          </span>
        );
      case 'completed':
        return (
          <span className="text-[11px] font-mono text-emerald-300 font-semibold bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
            Completed
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-mono text-slate-400 capitalize bg-slate-800 px-2 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  const getHistoryEventBadge = (eventType: HistoryItem['eventType']) => {
    switch (eventType) {
      case 'downloadFolderImported':
        return (
          <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Imported
          </span>
        );
      case 'grabbed':
        return (
          <span className="text-[10px] font-mono font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 rounded-full flex items-center gap-1">
            <FileDown className="w-3 h-3" /> Grabbed
          </span>
        );
      case 'downloadFailed':
        return (
          <span className="text-[10px] font-mono font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            {eventType}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full pb-24">
      {/* Top Segmented Controls & Live Indicator */}
      <div className="flex items-center justify-between gap-3 mb-4">
        {/* Segmented Tab Buttons */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'queue'
                ? 'bg-sky-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Queue</span>
            {queue.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'queue' ? 'bg-slate-950 text-sky-400' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {queue.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'history'
                ? 'bg-sky-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden xs:inline">Live Sync</span>
          </div>
          <button
            onClick={() => fetchActivityData(false)}
            disabled={isRefreshing}
            className={`p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors ${
              isRefreshing ? 'animate-spin text-sky-400' : ''
            }`}
            title="Refresh queue"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content View */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          <span className="text-xs font-mono">Fetching downloads from Sonarr...</span>
        </div>
      ) : activeTab === 'queue' ? (
        /* QUEUE LIST */
        queue.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
            <Download className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-200">No active downloads</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Your download queue is currently empty. Releases grabbed manually or monitored episodes ready for download will appear here with live speed and ETA.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((item) => {
              const progress = item.progressPercent ?? (item.size && item.sizeleft ? Math.round(((item.size - item.sizeleft) / item.size) * 100) : 0);
              const downloadedSize = item.size && item.sizeleft ? item.size - item.sizeleft : 0;

              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-900/80 border border-slate-800/90 rounded-2xl flex flex-col gap-3 shadow-xs hover:border-slate-700/80 transition-all"
                >
                  {/* Row 1: Series Title, Episode, and Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Tv className="w-4 h-4 text-sky-400 shrink-0" />
                        <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate">
                          {item.series?.title || 'Unknown Series'}
                        </h3>
                        {item.episode && (
                          <span className="text-xs font-mono font-bold text-sky-400 shrink-0">
                            S{String(item.episode.seasonNumber).padStart(2, '0')}E{String(item.episode.episodeNumber).padStart(2, '0')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-300 font-medium truncate mt-0.5">
                        {item.episode?.title || item.title}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {getStatusBadge(item.status)}
                    </div>
                  </div>

                  {/* Row 2: Progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                      <span className="text-slate-300 font-semibold">{progress}%</span>
                      <div className="flex items-center gap-1.5">
                        <span>{formatBytes(downloadedSize)} / {formatBytes(item.size)}</span>
                        {item.downloadSpeed && item.status === 'downloading' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-sky-300 font-semibold">{item.downloadSpeed}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Animated Striped Progress Bar for Active Downloads */}
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/60 p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.status === 'downloading'
                            ? 'bg-gradient-to-r from-sky-500 to-cyan-400 shadow-sm shadow-sky-500/20'
                            : item.status === 'paused'
                            ? 'bg-slate-600'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(3, progress)}%` }}
                      />
                    </div>
                  </div>

                  {/* Row 3: Client info & Action controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-xs font-mono text-slate-400">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] ${getQualityBadgeColor(item.quality?.quality?.name)}`}>
                        {item.quality?.quality?.name || '1080p'}
                      </span>
                      <span>{item.downloadClient || 'Client'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{item.protocol || 'torrent'}</span>
                      {item.timeleft && item.timeleft !== '--:--' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock className="w-3 h-3 text-sky-400" />
                            {item.timeleft}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTogglePause(item)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title={item.status === 'downloading' ? 'Pause download' : 'Resume download'}
                      >
                        {item.status === 'downloading' ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-sky-400" />
                        )}
                      </button>

                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Remove from download client"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* HISTORY TIMELINE */
        history.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
            <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-200">No download history</h3>
            <p className="text-xs text-slate-400 mt-1">
              Events such as grabbed releases, completed imports, and renames will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((hist) => (
              <div
                key={hist.id}
                className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-start justify-between gap-3 hover:bg-slate-800/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100 truncate">
                      {hist.seriesTitle}
                    </span>
                    <span className="text-[11px] font-mono text-sky-400 shrink-0">
                      S{String(hist.seasonNumber).padStart(2, '0')}E{String(hist.episodeNumber).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 font-medium truncate mt-0.5">
                    {hist.episodeTitle}
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 truncate mt-1">
                    {hist.sourceTitle}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-1">
                    <span>{formatDate(hist.date)} {formatTime(hist.date)}</span>
                    <span aria-hidden="true">·</span>
                    <span className={getQualityBadgeColor(hist.quality?.quality?.name)}>
                      {hist.quality?.quality?.name || 'HD'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 pt-0.5">
                  {getHistoryEventBadge(hist.eventType)}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Delete / Cancel confirmation modal with Blocklist option */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-100">Remove from Download Client?</h3>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to cancel and remove{' '}
              <strong className="text-slate-100 font-mono">{deleteTarget.series?.title} S{deleteTarget.episode?.seasonNumber}E{deleteTarget.episode?.episodeNumber}</strong>{' '}
              from your download client?
            </p>

            <label className="flex items-start gap-2.5 p-3 bg-slate-950/60 border border-slate-800 rounded-xl mb-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={blocklistOnDelete}
                onChange={(e) => setBlocklistOnDelete(e.target.checked)}
                className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 bg-slate-800 border-slate-700 mt-0.5"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Add release to Blocklist
                </span>
                <span className="text-[11px] text-slate-400">
                  Prevents Sonarr from automatically grabbing this exact release file again.
                </span>
              </div>
            </label>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteQueue}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold flex items-center gap-2 transition-transform shadow-sm"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Remove Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
