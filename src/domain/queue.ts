import type { QueueItem } from '../api/types';
import { formatBytes } from './format';

export type QueueItemView = {
  title: string;
  subtitle: string;
  progress: number | null;
  timeLeft: string | null;
  tone: 'normal' | 'warning' | 'error';
  messages: string[];
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Sonarr timeleft ('hh:mm:ss' or 'd.hh:mm:ss') to '4 min' / '1 h 30 min' / '1 d 2 h'. */
function formatTimeLeft(raw?: string): string | null {
  const m = raw?.match(/^(?:(\d+)\.)?(\d+):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [d, h, min] = [Number(m[1] ?? 0), Number(m[2]), Number(m[3])];
  if (d > 0) return h > 0 ? `${d} d ${h} h` : `${d} d`;
  if (h > 0) return min > 0 ? `${h} h ${min} min` : `${h} h`;
  return min > 0 ? `${min} min` : '< 1 min';
}

export function queueItemView(q: QueueItem): QueueItemView {
  const e = q.episode;
  const parts = [
    e ? `S${pad(e.seasonNumber)}E${pad(e.episodeNumber)}` : null,
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
