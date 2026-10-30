import { createLiveApi } from '../liveApi';
import type { LookupSeries, Series } from '../types';

const ok = (body?: unknown, status = 200) =>
  ({
    ok: true,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  }) as unknown as Response;
const setup = (body?: unknown) => {
  const f = jest.fn().mockResolvedValue(ok(body));
  const api = createLiveApi({ baseUrl: 'http://h:8989', apiKey: 'abc' }, f as unknown as typeof fetch);
  return { f, api };
};
const call = (f: jest.Mock) => {
  const [url, init] = f.mock.calls[0];
  return { url: url as string, method: init.method as string, body: init.body ? JSON.parse(init.body) : undefined, init };
};
const B = 'http://h:8989/api/v3';

const series = { id: 5, title: 'T', status: 'continuing', monitored: true, qualityProfileId: 1, seriesType: 'standard', images: [], seasons: [] } as Series;

test('getSeries', async () => {
  const { f, api } = setup([]);
  await api.getSeries();
  expect(call(f)).toMatchObject({ url: `${B}/series`, method: 'GET' });
});
test('getSeriesById', async () => {
  const { f, api } = setup(series);
  await api.getSeriesById(5);
  expect(call(f)).toMatchObject({ url: `${B}/series/5`, method: 'GET' });
});
test('updateSeries PUTs full object', async () => {
  const { f, api } = setup(series);
  await api.updateSeries(series);
  expect(call(f)).toMatchObject({ url: `${B}/series/5`, method: 'PUT', body: series });
});
test('deleteSeries', async () => {
  const { f, api } = setup();
  await api.deleteSeries(5, true);
  expect(call(f)).toMatchObject({ url: `${B}/series/5?deleteFiles=true`, method: 'DELETE' });
});
test('lookupSeries', async () => {
  const { f, api } = setup([]);
  await api.lookupSeries('the bear');
  expect(call(f)).toMatchObject({ url: `${B}/series/lookup?term=the%20bear`, method: 'GET' });
});
const lookup = { title: 'The Bear', tvdbId: 99, status: 'continuing', monitored: false, seriesType: 'standard', images: [], seasons: [] } as LookupSeries;
test('addSeries', async () => {
  const { f, api } = setup(series);
  await api.addSeries({ lookup, rootFolderPath: '/tv', qualityProfileId: 4, monitor: 'future', seriesType: 'anime', searchForMissingEpisodes: true });
  expect(call(f)).toMatchObject({
    url: `${B}/series`,
    method: 'POST',
    body: { ...lookup, rootFolderPath: '/tv', qualityProfileId: 4, seriesType: 'anime', monitored: true, seasonFolder: true, addOptions: { monitor: 'future', searchForMissingEpisodes: true } },
  });
});
test("addSeries monitor 'none' sends monitored false", async () => {
  const { f, api } = setup(series);
  await api.addSeries({ lookup, rootFolderPath: '/tv', qualityProfileId: 4, monitor: 'none', seriesType: 'standard', searchForMissingEpisodes: false });
  expect(call(f).body.monitored).toBe(false);
  expect(call(f).body.addOptions).toEqual({ monitor: 'none', searchForMissingEpisodes: false });
});
test('getRootFolders / getQualityProfiles', async () => {
  const a = setup([]);
  await a.api.getRootFolders();
  expect(call(a.f)).toMatchObject({ url: `${B}/rootfolder`, method: 'GET' });
  const b = setup([]);
  await b.api.getQualityProfiles();
  expect(call(b.f)).toMatchObject({ url: `${B}/qualityprofile`, method: 'GET' });
});
test('getEpisodes', async () => {
  const { f, api } = setup([]);
  await api.getEpisodes(7);
  expect(call(f)).toMatchObject({ url: `${B}/episode?seriesId=7&includeEpisodeFile=true`, method: 'GET' });
});
test('setEpisodesMonitored', async () => {
  const { f, api } = setup();
  await api.setEpisodesMonitored([1, 2], false);
  expect(call(f)).toMatchObject({ url: `${B}/episode/monitor`, method: 'PUT', body: { episodeIds: [1, 2], monitored: false } });
});
test('getCalendar', async () => {
  const { f, api } = setup([]);
  await api.getCalendar('a', 'b');
  expect(call(f)).toMatchObject({ url: `${B}/calendar?start=a&end=b&includeSeries=true&unmonitored=false`, method: 'GET' });
});
test('getQueue', async () => {
  const { f, api } = setup({ page: 1, pageSize: 50, totalRecords: 0, records: [] });
  await api.getQueue(1, 50);
  expect(call(f)).toMatchObject({ url: `${B}/queue?page=1&pageSize=50&includeSeries=true&includeEpisode=true`, method: 'GET' });
});
test('removeQueueItem', async () => {
  const { f, api } = setup();
  await api.removeQueueItem(9, { blocklist: true, removeFromClient: false });
  expect(call(f)).toMatchObject({ url: `${B}/queue/9?removeFromClient=false&blocklist=true`, method: 'DELETE' });
});
test('getHistory', async () => {
  const { f, api } = setup({ page: 2, pageSize: 50, totalRecords: 0, records: [] });
  await api.getHistory(2, 50);
  expect(call(f)).toMatchObject({
    url: `${B}/history?page=2&pageSize=50&sortKey=date&sortDirection=descending&includeSeries=true&includeEpisode=true`,
    method: 'GET',
  });
});
test('searchEpisodes / searchSeason', async () => {
  const a = setup();
  await a.api.searchEpisodes([3]);
  expect(call(a.f)).toMatchObject({ url: `${B}/command`, method: 'POST', body: { name: 'EpisodeSearch', episodeIds: [3] } });
  const b = setup();
  await b.api.searchSeason(7, 2);
  expect(call(b.f)).toMatchObject({ method: 'POST', body: { name: 'SeasonSearch', seriesId: 7, seasonNumber: 2 } });
});
test('getReleases uses 120s timeout and passes caller signal through', async () => {
  const spy = jest.spyOn(global, 'setTimeout');
  const { f, api } = setup([]);
  const ac = new AbortController();
  await api.getReleases({ episodeId: 3 }, ac.signal);
  expect(call(f)).toMatchObject({ url: `${B}/release?episodeId=3`, method: 'GET' });
  expect(spy.mock.calls.some((c) => c[1] === 120000)).toBe(true);
  const sig = call(f).init.signal as AbortSignal;
  expect(sig.aborted).toBe(false);
  ac.abort();
  expect(sig.aborted).toBe(true);
  spy.mockRestore();
});
test('getReleases aborts immediately if caller signal already aborted', async () => {
  const { f, api } = setup([]);
  const ac = new AbortController();
  ac.abort();
  await api.getReleases({ episodeId: 3 }, ac.signal);
  expect(call(f).init.signal.aborted).toBe(true);
});
test('getReleases season variant', async () => {
  const { f, api } = setup([]);
  await api.getReleases({ seriesId: 7, seasonNumber: 2 });
  expect(call(f).url).toBe(`${B}/release?seriesId=7&seasonNumber=2`);
});
test('grabRelease', async () => {
  const { f, api } = setup();
  await api.grabRelease({ guid: 'g', indexerId: 2 });
  expect(call(f)).toMatchObject({ url: `${B}/release`, method: 'POST', body: { guid: 'g', indexerId: 2 } });
});
test('posterSource keeps key in headers only, no request', () => {
  const { f, api } = setup();
  expect(api.posterSource(7)).toEqual({ uri: 'http://h:8989/api/v3/mediacover/7/poster-250.jpg', headers: { 'X-Api-Key': 'abc' } });
  expect(f).not.toHaveBeenCalled();
});
