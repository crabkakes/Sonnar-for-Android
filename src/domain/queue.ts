import type { QueueItem } from '../api/types';
import { episodeCode, formatBytes } from './format';

export type QueueStatusLabel = 'Downloading' | 'Queued' | 'Paused' | 'Importing' | 'Import pending' | 'Completed' | 'Failed';

export type QueueItemView = {
  title: string;
  status: QueueStatusLabel;
  subtitle: string;
  progress: number | null;
  timeLeft: string | null;
  tone: 'normal' | 'warning' | 'error';
  messages: string[];
};

/** Sonarr timeleft ('hh:mm:ss' or 'd.hh:mm:ss') to '4 min' / '1 h 30 min' / '1 d 2 h'. */
function formatTimeLeft(raw?: string): string | null {
  const m = raw?.match(/^(?:(\d+)\.)?(\d+):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [d, h, min] = [Number(m[1] ?? 0), Number(m[2]), Number(m[3])];
  if (d > 0) return h > 0 ? `${d} d ${h} h` : `${d} d`;
  if (h > 0) return min > 0 ? `${h} h ${min} min` : `${h} h`;
  return min > 0 ? `${min} min` : '< 1 min';
}

/**
 * One short label for where a queue item is. Sonarr's `trackedDownloadState` wins once the download
 * client is done (import stages), otherwise the download client `status` decides.
 */
export function queueStatusLabel(q: Pick<QueueItem, 'status' | 'trackedDownloadState'>): QueueStatusLabel {
  const state = q.trackedDownloadState?.toLowerCase();
  const status = q.status?.toLowerCase();
  if (state === 'importing') return 'Importing';
  if (state === 'importpending' || state === 'importblocked') return 'Import pending';
  if (state === 'imported') return 'Completed';
  if (state === 'failed' || state === 'failedpending' || status === 'failed') return 'Failed';
  if (status === 'paused') return 'Paused';
  if (status === 'queued' || status === 'delay') return 'Queued';
  if (status === 'completed') return 'Completed';
  return 'Downloading';
}

export function queueItemView(q: QueueItem): QueueItemView {
  const e = q.episode;
  const parts = [
    e ? episodeCode(e) : null,
    q.quality?.quality?.name ?? null,
    q.size ? formatBytes(q.size) : null,
  ].filter((p): p is string => !!p);
  const progress =
    q.size && q.size > 0 && q.sizeleft !== undefined ? Math.min(1, Math.max(0, (q.size - q.sizeleft) / q.size)) : null;
  const messages = (q.statusMessages ?? []).flatMap((s) => (s.messages?.length ? s.messages : s.title ? [s.title] : []));
  if (q.errorMessage) messages.push(q.errorMessage);
  const tone = q.trackedDownloadStatus === 'error' || q.errorMessage ? 'error' : q.trackedDownloadStatus === 'warning' ? 'warning' : 'normal';
  return {
    title: q.series?.title || q.title,
    status: queueStatusLabel(q),
    subtitle: parts.join(' · '),
    progress,
    timeLeft: formatTimeLeft(q.timeleft),
    tone,
    messages,
  };
}

const LABELS: Record<string, string> = {
  grabbed: 'Grabbed',
  downloadFolderImported: 'Imported',
  downloadFailed: 'Failed',
  episodeFileDeleted: 'Deleted',
};

export function historyEventLabel(eventType: string): string {
  if (LABELS[eventType]) return LABELS[eventType];
  return eventType
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/ ([a-z])/g, (_, c: string) => ` ${c.toUpperCase()}`);
}
