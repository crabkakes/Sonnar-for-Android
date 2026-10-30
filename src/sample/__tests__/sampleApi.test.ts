import { createSampleApi } from '../sampleApi';

const now = new Date('2026-10-30T15:00:00Z');
const api = () => createSampleApi(() => now);

test('series are fictional and cover the edge cases', async () => {
  const series = await api().getSeries();
  expect(series.length).toBeGreaterThanOrEqual(6);
  const missing = (s: (typeof series)[number]) =>
    (s.statistics?.episodeCount ?? 0) - (s.statistics?.episodeFileCount ?? 0);
  expect(series.some((s) => missing(s) === 3)).toBe(true);
  expect(series.some((s) => s.status === 'ended')).toBe(true);
  expect(series.some((s) => s.images.length === 0)).toBe(true);
  expect(series.map((s) => s.title)).toEqual(expect.arrayContaining(['Harbor Lights', 'The Quiet Office', 'Starfall']));
});

test('calendar for the week containing now has episodes on 3+ days', async () => {
  const start = new Date('2026-10-25T00:00:00Z');
  const end = new Date('2026-11-01T00:00:00Z');
  const eps = await api().getCalendar(start.toISOString(), end.toISOString());
  const days = new Set(eps.map((e) => e.airDateUtc!.slice(0, 10)));
  expect(days.size).toBeGreaterThanOrEqual(3);
});

test('queue has a downloading item and a stalled warning item', async () => {
  const q = await api().getQueue(1, 50);
  expect(q.records.some((r) => r.status === 'downloading' && r.trackedDownloadStatus === 'ok')).toBe(true);
  const warn = q.records.find((r) => r.trackedDownloadStatus === 'warning');
  expect(warn?.statusMessages?.[0]?.messages.join(' ')).toMatch(/stalled/i);
});

test('getReleases resolves after 800ms with a varied list', async () => {
  jest.useFakeTimers();
  try {
    const p = api().getReleases({ episodeId: 1 });
    let done = false;
    p.then(() => (done = true));
    await jest.advanceTimersByTimeAsync(799);
    expect(done).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    const rel = await p;
    expect(rel.length).toBeGreaterThanOrEqual(8);
    expect(rel.filter((r) => r.rejected).length).toBeGreaterThanOrEqual(2);
    const res = rel.map((r) => r.quality.quality.resolution);
    expect(res).toContain(1080);
    expect(res).toContain(2160);
  } finally {
    jest.useRealTimers();
  }
});

test('removeQueueItem resolves and the queue is unchanged', async () => {
  const a = api();
  const before = await a.getQueue(1, 50);
  await expect(a.removeQueueItem(before.records[0].id, { blocklist: false, removeFromClient: true })).resolves.toBeUndefined();
  expect(await a.getQueue(1, 50)).toEqual(before);
});

test('posterSource is null (no image assets)', () => {
  expect(api().posterSource(1)).toBeNull();
});
