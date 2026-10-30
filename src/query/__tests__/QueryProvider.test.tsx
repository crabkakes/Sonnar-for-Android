import { useEffect } from 'react';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { ConnectionProvider, connectionIdentity, useConnection, type Connection } from '../../connection/ConnectionProvider';
import { saveAddDefaults } from '../../domain/addDefaults';
import { cacheKeyFor, clearConnection, hashBaseUrl } from '../../connection/storage';
import { createQueryClient, QueryProvider, shouldPersistQuery } from '../QueryProvider';
import { useSonarrQuery } from '../hooks';

const cacheOf = (baseUrl: string) => cacheKeyFor(hashBaseUrl(baseUrl));

let conn: Connection;
let refetch: () => void;
function Harness() {
  const c = useConnection();
  useEffect(() => {
    conn = c;
  });
  const q = useSonarrQuery(['series'], (api) => api.getSeries());
  useEffect(() => {
    refetch = q.refetch;
  });
  const who = c.state.mode === 'live' ? c.state.config.baseUrl : c.state.mode;
  return <Text>{`${who} data:${q.data ? q.data.length : 'none'}`}</Text>;
}

const cacheKeys = async () => (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('rfs.cache.'));
const settle = () => act(() => jest.advanceTimersByTimeAsync(3000)); // past the persister throttle

beforeEach(async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, text: async () => '[]' })) as unknown as typeof fetch;
  await clearConnection();
  await AsyncStorage.clear();
});
afterEach(() => jest.useRealTimers());

test('cache is keyed per connection, deleted on switch, and never written in sample mode', async () => {
  await render(
    <ConnectionProvider>
      <QueryProvider>
        <Harness />
      </QueryProvider>
    </ConnectionProvider>,
  );
  await waitFor(() => expect(conn.loading).toBe(false));

  await act(() => conn.setLive({ baseUrl: 'http://a.test:8989', apiKey: 'k' }));
  await waitFor(() => screen.getByText('http://a.test:8989 data:0'));
  await settle();
  expect(await cacheKeys()).toEqual([cacheOf('http://a.test:8989')]);

  await act(() => conn.setLive({ baseUrl: 'http://b.test:8989', apiKey: 'k' }));
  await waitFor(() => screen.getByText('http://b.test:8989 data:0'));
  await settle();
  expect(await cacheKeys()).toEqual([cacheOf('http://b.test:8989')]);

  await act(() => conn.setSample());
  await waitFor(() => screen.getByText('sample data:7'));
  await settle();
  expect(await cacheKeys()).toEqual([]);
});

test('disconnect leaves no cache key even if a throttled write was pending', async () => {
  await render(
    <ConnectionProvider>
      <QueryProvider>
        <Harness />
      </QueryProvider>
    </ConnectionProvider>,
  );
  await waitFor(() => expect(conn.loading).toBe(false));
  await act(() => conn.setLive({ baseUrl: 'http://a.test:8989', apiKey: 'k' }));
  await waitFor(() => screen.getByText('http://a.test:8989 data:0'));
  await settle();
  expect(await cacheKeys()).toEqual([cacheOf('http://a.test:8989')]);
  // A cache change queues a throttled write; disconnect before it fires.
  await act(async () => {
    refetch();
    await jest.advanceTimersByTimeAsync(10);
  });
  await act(() => conn.disconnect());
  await settle();
  expect(await cacheKeys()).toEqual([]);
});

const SECRET = 'indexer-secret-123';
function EverythingHarness() {
  const c = useConnection();
  useEffect(() => {
    conn = c;
  });
  const series = useSonarrQuery(['series'], (api) => api.getSeries());
  const folders = useSonarrQuery(['rootFolders'], (api) => api.getRootFolders());
  const profiles = useSonarrQuery(['qualityProfiles'], (api) => api.getQualityProfiles());
  const history = useSonarrQuery(['history'], (api) => api.getHistory(1, 50));
  const queue = useSonarrQuery(['queue'], (api) => api.getQueue(1, 50));
  const lookup = useSonarrQuery(['lookup', 'x'], (api) => api.lookupSeries('x'));
  const done = [series, folders, profiles, history, queue, lookup].every((q) => q.data !== undefined);
  return <Text>{done ? 'loaded' : 'loading'}</Text>;
}

function mockSonarrPaths() {
  const page = (records: unknown[]) => JSON.stringify({ page: 1, pageSize: 50, totalRecords: records.length, records });
  global.fetch = jest.fn(async (url: string) => {
    const path = new URL(url).pathname;
    const body =
      path.endsWith('/history')
        ? page([{ id: 1, eventType: 'grabbed', data: { downloadUrl: `https://indexer.example/dl?apikey=${SECRET}` } }])
        : path.endsWith('/queue')
        ? page([{ id: 2, title: 'q', downloadId: SECRET }])
        : path.endsWith('/series/lookup')
        ? JSON.stringify([{ title: SECRET, tvdbId: 1 }])
        : path.endsWith('/rootfolder')
        ? JSON.stringify([{ id: 1, path: '/tv' }])
        : path.endsWith('/qualityprofile')
        ? JSON.stringify([{ id: 1, name: 'HD' }])
        : '[]';
    return { ok: true, status: 200, text: async () => body };
  }) as unknown as typeof fetch;
}

test('only series/episodes/calendar/rootFolders/qualityProfiles are persisted; history, queue, lookup never are', async () => {
  mockSonarrPaths();
  await render(
    <ConnectionProvider>
      <QueryProvider>
        <EverythingHarness />
      </QueryProvider>
    </ConnectionProvider>,
  );
  await waitFor(() => expect(conn.loading).toBe(false));
  await act(() => conn.setLive({ baseUrl: 'http://a.test:8989', apiKey: 'k' }));
  await waitFor(() => screen.getByText('loaded'));
  await settle();
  const raw = (await AsyncStorage.getItem(cacheOf('http://a.test:8989')))!;
  const kinds = JSON.parse(raw).clientState.queries.map((q: { queryKey: unknown[] }) => q.queryKey[1]).sort();
  expect(kinds).toEqual(['qualityProfiles', 'rootFolders', 'series']);
  expect(raw).not.toContain(SECRET);
});

test('after a live session no AsyncStorage key or value contains the server address', async () => {
  mockSonarrPaths();
  await render(
    <ConnectionProvider>
      <QueryProvider>
        <EverythingHarness />
      </QueryProvider>
    </ConnectionProvider>,
  );
  await waitFor(() => expect(conn.loading).toBe(false));
  await act(() => conn.setLive({ baseUrl: 'http://nas.tailnet.ts.net:8989/sonarr', apiKey: 'the-api-key' }));
  await waitFor(() => screen.getByText('loaded'));
  await act(() => saveAddDefaults(connectionIdentity(conn.state), { rootFolderPath: '/tv', qualityProfileId: 1, monitor: 'all', seriesType: 'standard', searchForMissingEpisodes: true }));
  await settle();
  const keys = await AsyncStorage.getAllKeys();
  expect(keys.some((k) => k.startsWith('rfs.cache.'))).toBe(true);
  expect(keys.some((k) => k.startsWith('rfs.addDefaults.'))).toBe(true);
  const dump = JSON.stringify(await AsyncStorage.multiGet(keys));
  expect(dump).not.toMatch(/nas\.tailnet|ts\.net|8989|sonarr\b|the-api-key/i);
});

test('shouldPersistQuery allowlist covers every query kind the app uses', () => {
  const client = createQueryClient();
  const kinds = ['series', 'episodes', 'calendar', 'rootFolders', 'qualityProfiles', 'history', 'queue', 'lookup', 'releases'];
  for (const k of kinds) client.setQueryData(['abcd1234', k, 1], { ok: true });
  const persisted = client.getQueryCache().getAll().filter(shouldPersistQuery).map((q) => q.queryKey[1]);
  expect(persisted).toEqual(['series', 'episodes', 'calendar', 'rootFolders', 'qualityProfiles']);
});
