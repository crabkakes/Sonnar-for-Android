import type { ReactElement } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { SonarrApi } from '../src/api/types';
import { ConnectionContext, type Connection } from '../src/connection/ConnectionProvider';
import { NoticeProvider } from '../src/ui/Notice';
import { ThemeProvider } from '../src/ui/theme';
import { createFakeApi } from './fakeApi';

type Options = { api?: Partial<SonarrApi>; mode?: 'live' | 'sample' };

/**
 * Renders `ui` with a fake connection, an in-memory query client (no persistence, no retries)
 * and the theme/notice providers. Async because RNTL 14's `render` is async: always `await` it. Returns the usual RNTL result plus the fake `api`.
 * Expo Router screens: wrap `ui` in a router test harness at the marked point if one is needed.
 */
export async function renderWithProviders(ui: ReactElement, { api, mode = 'live' }: Options = {}) {
  const fakeApi = createFakeApi(api);
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 30_000, networkMode: 'always' },
      mutations: { retry: false, gcTime: Infinity, networkMode: 'always' },
    },
  });
  const connection: Connection = {
    state:
      mode === 'sample'
        ? { mode: 'sample' }
        : { mode: 'live', config: { baseUrl: 'http://sonarr.test', apiKey: 'test-key' } },
    api: fakeApi,
    loading: false,
    setLive: jest.fn(async () => {}),
    setSample: jest.fn(async () => {}),
    disconnect: jest.fn(async () => {}),
  };
  const result = await render(
    <ThemeProvider>
      <NoticeProvider>
        <ConnectionContext.Provider value={connection}>
          <QueryClientProvider client={client}>
            {/* Hook point: wrap in a router/navigation container here when screen tests need it. */}
            {ui}
          </QueryClientProvider>
        </ConnectionContext.Provider>
      </NoticeProvider>
    </ThemeProvider>,
  );
  return { ...result, api: fakeApi, connection, client };
}
