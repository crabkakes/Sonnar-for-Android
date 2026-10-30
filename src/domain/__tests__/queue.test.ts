import type { QueueItem } from '../../api/types';
import { formatRelative } from '../format';
import { historyEventLabel, queueItemView } from '../queue';

const base: QueueItem = { id: 1, title: 'Show.S01E02.1080p', status: 'downloading' };

describe('queueItemView', () => {
  it('normal item', () => {
    const v = queueItemView({
      ...base,
      series: { id: 3, title: 'Show' },
      episode: { id: 9, seriesId: 3, seasonNumber: 1, episodeNumber: 2, hasFile: false, monitored: true },
      quality: { quality: { name: 'WEBDL-1080p' } },
      size: 1024 * 1024 * 1024,
      sizeleft: 512 * 1024 * 1024,
      timeleft: '00:04:12',
      trackedDownloadStatus: 'ok',
    } as QueueItem);
    expect(v).toEqual({
      title: 'Show',
      subtitle: 'S01E02 · WEBDL-1080p · 1.0 GB',
      progress: 0.5,
      timeLeft: '4 min',
      tone: 'normal',
      messages: [],
    });
  });

  it('stalled warning carries messages and tone', () => {
    const v = queueItemView({
      ...base,
      trackedDownloadStatus: 'warning',
      statusMessages: [{ title: 'Show.S01E02', messages: ['No files found are eligible for import'] }],
    });
    expect(v.tone).toBe('warning');
    expect(v.messages).toEqual(['No files found are eligible for import']);
  });

  it('error message gives error tone and is appended', () => {
    const v = queueItemView({ ...base, errorMessage: 'Download failed' });
    expect(v.tone).toBe('error');
    expect(v.messages).toEqual(['Download failed']);
  });

  it('sparse item: falls back to q.title, null progress, no crash', () => {
    const v = queueItemView(base);
    expect(v).toEqual({ title: 'Show.S01E02.1080p', subtitle: '', progress: null, timeLeft: null, tone: 'normal', messages: [] });
  });

  it('size 0 gives null progress; sizeleft > size clamps', () => {
    expect(queueItemView({ ...base, size: 0, sizeleft: 0 }).progress).toBeNull();
    expect(queueItemView({ ...base, size: 100, sizeleft: 150 }).progress).toBe(0);
  });

  it.each([
    ['00:04:12', '4 min'],
    ['01:30:00', '1 h 30 min'],
    ['02:00:00', '2 h'],
    ['1.02:00:00', '1 d 2 h'],
    ['2.00:10:00', '2 d'],
    ['00:00:20', '< 1 min'],
    ['garbage', null],
  ])('timeleft %s -> %s', (input, out) => {
    expect(queueItemView({ ...base, timeleft: input }).timeLeft).toBe(out);
  });
});

describe('historyEventLabel', () => {
  it.each([
    ['grabbed', 'Grabbed'],
    ['downloadFolderImported', 'Imported'],
    ['downloadFailed', 'Failed'],
    ['episodeFileDeleted', 'Deleted'],
    ['episodeFileRenamed', 'Episode File Renamed'],
    ['', ''],
  ])('%s -> %s', (t, label) => expect(historyEventLabel(t)).toBe(label));
});

describe('formatRelative', () => {
  const now = new Date('2026-10-30T12:00:00Z');
  it.each([
    ['2026-10-30T11:59:40Z', 'just now'],
    ['2026-10-30T11:55:00Z', '5 min ago'],
    ['2026-10-30T09:00:00Z', '3 h ago'],
    ['2026-10-28T12:00:00Z', '2 d ago'],
    ['2026-10-30T12:05:00Z', 'just now'],
    ['nope', '—'],
  ])('%s -> %s', (iso, out) => expect(formatRelative(iso, now)).toBe(out));

  it('older than a week shows a date', () => {
    expect(formatRelative('2026-10-01T12:00:00Z', now)).toMatch(/Oct\s+1/);
    expect(formatRelative('2025-03-05T12:00:00Z', now)).toMatch(/2025/);
  });
});
