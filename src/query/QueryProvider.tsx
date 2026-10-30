import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { connectionIdentity, useConnection } from '../connection/ConnectionProvider';
import { cacheKeyFor } from '../connection/storage';

const DAY_MS = 24 * 60 * 60 * 1000;
export const GC_TIME = 7 * DAY_MS;
export const STALE_TIME = 30_000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // No NetInfo: always attempt the request and let the Sonarr client report unreachable/timeout.
      queries: { gcTime: GC_TIME, staleTime: STALE_TIME, retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  });
}

let wired = false;
function wireAppState() {
  if (wired || Platform.OS === 'web') return;
  wired = true;
  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener('change', (s) => handleFocus(s === 'active'));
    return () => sub.remove();
  });
  onlineManager.setEventListener((setOnline) => {
    setOnline(true);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setOnline(true));
    return () => sub.remove();
  });
}

/** One QueryClient per connection; live connections are persisted, sample is memory-only. */
export function QueryProvider({ children }: { children: ReactNode }) {
  wireAppState();
  const { state } = useConnection();
  const identity = connectionIdentity(state);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- a new client per connection identity is the point
  const client = useMemo(() => createQueryClient(), [identity]);
  const persistKey = state.mode === 'live' ? cacheKeyFor(state.config.baseUrl) : null;
  const persister = useMemo(
    () => (persistKey ? createAsyncStoragePersister({ storage: AsyncStorage, key: persistKey }) : null),
    [persistKey],
  );

  // When the connection changes, delete the previous connection's persisted cache.
  const previousKey = useRef<string | null>(persistKey);
  useEffect(() => {
    if (previousKey.current && previousKey.current !== persistKey) {
      void AsyncStorage.removeItem(previousKey.current);
    }
    previousKey.current = persistKey;
  }, [persistKey]);

  if (persister) {
    return (
      <PersistQueryClientProvider client={client} persistOptions={{ persister, maxAge: GC_TIME }}>
        {children}
      </PersistQueryClientProvider>
    );
  }
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
