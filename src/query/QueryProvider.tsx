import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { defaultShouldDehydrateQuery, focusManager, onlineManager, QueryClient, QueryClientProvider, type Query } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { connectionIdentity, useConnection } from '../connection/ConnectionProvider';
import { cacheKeyFor } from '../connection/storage';

const DAY_MS = 24 * 60 * 60 * 1000;
export const GC_TIME = 7 * DAY_MS;
export const STALE_TIME = 30_000;

/**
 * Query kinds (the key segment after the connection identity) that are saved to disk for offline
 * viewing. Everything else stays in memory: history and releases carry indexer download URLs with
 * third-party API keys, and queue/lookup are volatile. Keeping the list short also keeps the
 * persisted blob under Android's AsyncStorage row limit for large libraries.
 */
export const PERSISTED_QUERY_KINDS: readonly string[] = ['series', 'episodes', 'calendar', 'rootFolders', 'qualityProfiles'];

export function shouldPersistQuery(query: Query): boolean {
  const kind = query.queryKey[1];
  return typeof kind === 'string' && PERSISTED_QUERY_KINDS.includes(kind) && defaultShouldDehydrateQuery(query);
}

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
  const persistKey = state.mode === 'live' ? cacheKeyFor(identity) : null;
  const persisted = useMemo(() => {
    if (!persistKey) return null;
    let retired = false;
    // Once retired, throttled writes still queued in the persister are dropped,
    // so they cannot recreate a deleted cache key.
    const storage = {
      getItem: (k: string) => AsyncStorage.getItem(k),
      setItem: (k: string, v: string) => (retired ? Promise.resolve() : AsyncStorage.setItem(k, v)),
      removeItem: (k: string) => AsyncStorage.removeItem(k),
    };
    return {
      key: persistKey,
      persister: createAsyncStoragePersister({ storage, key: persistKey }),
      retire: () => {
        retired = true;
      },
    };
  }, [persistKey]);

  // When the connection changes or is cleared, retire the previous persister and delete its cache key.
  const previous = useRef(persisted);
  useEffect(() => {
    const old = previous.current;
    if (old && old.key !== persistKey) {
      old.retire();
      void AsyncStorage.removeItem(old.key);
    }
    previous.current = persisted;
  }, [persisted, persistKey]);

  if (persisted) {
    return (
      <PersistQueryClientProvider key={persisted.key} client={client} persistOptions={{ persister: persisted.persister, maxAge: GC_TIME, dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery } }}>
        {children}
      </PersistQueryClientProvider>
    );
  }
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
