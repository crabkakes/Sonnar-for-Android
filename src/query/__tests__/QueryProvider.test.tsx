import { useEffect } from 'react';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { ConnectionProvider, useConnection, type Connection } from '../../connection/ConnectionProvider';
import { clearConnection } from '../../connection/storage';
import { QueryProvider } from '../QueryProvider';
import { useSonarrQuery } from '../hooks';

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
  expect(await cacheKeys()).toEqual(['rfs.cache.http://a.test:8989']);

  await act(() => conn.setLive({ baseUrl: 'http://b.test:8989', apiKey: 'k' }));
  await waitFor(() => screen.getByText('http://b.test:8989 data:0'));
  await settle();
  expect(await cacheKeys()).toEqual(['rfs.cache.http://b.test:8989']);

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
  expect(await cacheKeys()).toEqual(['rfs.cache.http://a.test:8989']);
  // A cache change queues a throttled write; disconnect before it fires.
  await act(async () => {
    refetch();
    await jest.advanceTimersByTimeAsync(10);
  });
  await act(() => conn.disconnect());
  await settle();
  expect(await cacheKeys()).toEqual([]);
});
