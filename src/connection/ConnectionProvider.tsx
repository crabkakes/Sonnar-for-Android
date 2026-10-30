import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createLiveApi } from '../api/liveApi';
import type { ConnectionConfig, SonarrApi } from '../api/types';
import { createSampleApi } from '../sample/sampleApi';
import { clearConnection, connectionIdentity, loadConnection, saveLive, saveSample, type ConnectionState } from './storage';

export { connectionIdentity };

export type Connection = {
  state: ConnectionState;
  api: SonarrApi | null;
  /** True until the stored connection has been read. */
  loading: boolean;
  setLive(c: ConnectionConfig): Promise<void>;
  setSample(): Promise<void>;
  disconnect(): Promise<void>;
};

export const ConnectionContext = createContext<Connection | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConnectionState>({ mode: 'none' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadConnection()
      .then((s) => alive && setState(s))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const identity = connectionIdentity(state);
  const api = useMemo<SonarrApi | null>(() => {
    if (state.mode === 'live') return createLiveApi(state.config);
    if (state.mode === 'sample') return createSampleApi(() => new Date());
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild only when identity or key changes
  }, [identity, state.mode === 'live' ? state.config.apiKey : '']);

  const setLive = useCallback(async (c: ConnectionConfig) => {
    await saveLive(c);
    setState({ mode: 'live', config: c });
  }, []);
  const setSample = useCallback(async () => {
    await saveSample();
    setState({ mode: 'sample' });
  }, []);
  const disconnect = useCallback(async () => {
    setState(await clearConnection());
  }, []);

  const value = useMemo(
    () => ({ state, api, loading, setLive, setSample, disconnect }),
    [state, api, loading, setLive, setSample, disconnect],
  );
  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection(): Connection {
  const c = useContext(ConnectionContext);
  if (!c) throw new Error('useConnection must be used inside ConnectionProvider');
  return c;
}
