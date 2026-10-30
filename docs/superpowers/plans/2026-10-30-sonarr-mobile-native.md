# Remote for Sonarr — Native App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the React/Express web app in this repo with a native iPhone + Android app (Expo) that manages a Sonarr server directly over the local network.

**Architecture:** An Expo Router app. A single `SonarrApi` interface has two implementations: a live `fetch` client and a fixture-backed sample client. A `ConnectionProvider` picks which one to use. Screens read data through TanStack Query, whose cache is persisted per connection so screens open instantly and keep showing stale data when Sonarr can't be reached. All derived display logic (status lines, calendar weeks, release filtering, queue state) lives in pure `src/domain/*` functions that are unit tested.

**Tech Stack:** Expo (latest stable SDK at scaffold time, the one the current App Store Expo Go supports), TypeScript (strict), Expo Router, TanStack Query v5 + `@tanstack/react-query-persist-client` + `@tanstack/query-async-storage-persister`, `@react-native-async-storage/async-storage`, `expo-secure-store`, `expo-image`, `expo-localization`, `expo-build-properties`, Jest (`jest-expo`) + `@testing-library/react-native`. Use no UI component library.

**Spec:** `docs/superpowers/specs/2026-10-30-sonarr-mobile-native-design.md`

## Global Constraints

- No server of ours anywhere: no proxy, backend, relay, analytics, crash reporting, accounts, or EAS Build/EAS Update. Never add `expo-updates`.
- Every request goes straight from the phone to the user's Sonarr at `<baseUrl>/api/v3/...` with the `X-Api-Key` header. The API key never goes in a query string, a log, or AsyncStorage.
- The API key and URL are stored in `expo-secure-store` only.
- Supports Sonarr major versions 3 and 4 (`/api/v3`). Anything else gets a plain "unsupported version" or "not Sonarr" message.
- Android allows cleartext HTTP. iOS ATS allows HTTP to arbitrary hosts with `NSAllowsArbitraryLoads: true` only (adding `NSAllowsLocalNetworking` makes iOS 10+ ignore `NSAllowsArbitraryLoads`, which would block VPN/DNS hostnames like Tailscale MagicDNS or `nas.lan`) and has an `NSLocalNetworkUsageDescription`.
- Self-signed HTTPS isn't supported. A TLS or network failure on an `https://` URL shows the certificate hint.
- No Sonarr settings screens and no notifications or background tasks. Only one server, and no pause/resume of downloads (Sonarr's API has none).
- Light and dark themes follow the system setting.
- App display name: **Remote for Sonarr**. Bundle ID / package: `com.remoteforsonarr.app`, defined in one constant in `app.config.ts` so the owner can change it before the first store upload, which makes it permanent. Don't use the Sonarr logo.
- Phone-first layouts: tap targets ≥ 44pt, primary actions in the bottom half where practical, and lists virtualized (`FlatList`/`SectionList`).
- The free APK and the Play build are signed with **one shared upload/app-signing key** that lives outside the repo.
- Sample-data mode is always visibly marked, never mixes with a live connection, and its actions change nothing. Each action tells the user "Sample data — nothing was changed."
- All work happens on branch `native-app` and lands as one PR.

## Review Focus

1. **Messy URLs and keys** (no scheme, trailing slash, a URL base like `/sonarr`, spaces around the key, uppercase host) should normalize and connect, and never fail with a confusing error. Tested in Task 2.
2. **Leaving home mid-session:** the app goes off the LAN/VPN with data already loaded. Screens keep showing cached data with a "Can't reach Sonarr, showing saved data" banner, without going blank or crashing. Tested in Task 4.
3. **Day boundaries and time zones:** an episode at `2026-10-31T01:00:00Z` viewed from `America/New_York` belongs on Thu Oct 30, weeks start on the device's first weekday, and DST weeks still have 7 days. Tested in Task 9.
4. **Sparse or odd Sonarr data:** a series with no images or statistics, season 0 specials, episodes with no `airDateUtc` (TBA), queue items with no `episode`, `timeleft`, or `size`, and releases with no `seeders` all render without crashing. Tested in Tasks 6, 7, 10, 11.
5. **Large libraries:** 1,000+ series and 10,000+ history records stay smooth, with virtualized lists and paged history (50 per page) that never fetches everything. Tested in Tasks 6 and 10.

---

## File Structure

```
app.config.ts                     Expo config: name, IDs, ATS, cleartext, plugins
plugins/withAndroidReleaseSigning.js   Config plugin: release signingConfig from env
app/_layout.tsx                   Providers (Theme, Connection, Query, Notice), connection gate
app/(tabs)/_layout.tsx            Bottom tabs: Shows · Calendar · Activity
app/(tabs)/index.tsx              Shows
app/(tabs)/calendar.tsx           Calendar
app/(tabs)/activity.tsx           Activity (Queue | History)
app/server.tsx                    Server / first run
app/add.tsx                       Add show
app/series/[id].tsx               Show detail
app/releases.tsx                  Interactive search (?episodeId= or ?seriesId=&seasonNumber=)
src/api/types.ts                  Sonarr DTO subsets + SonarrApi interface
src/api/errors.ts                 SonarrError + userMessage()
src/api/url.ts                    normalizeBaseUrl()
src/api/liveApi.ts                createLiveApi(config): SonarrApi
src/sample/fixtures.ts            Fictional sample data, dates relative to now
src/sample/sampleApi.ts           createSampleApi(now): SonarrApi
src/connection/storage.ts         Secure-store load/save/clear
src/connection/ConnectionProvider.tsx   useConnection()
src/query/QueryProvider.tsx       QueryClient + per-connection persistence
src/query/hooks.ts                useSonarrQuery / useSonarrMutation / useIsStale
src/domain/series.ts              seriesSummary(), episodeStatus()
src/domain/calendar.ts            buildWeek(), groupByLocalDay()
src/domain/queue.ts               queueItemView()
src/domain/releases.ts            filterReleases(), sortReleases(), resolutionChips()
src/domain/format.ts              formatBytes(), formatAirTime(), formatAge()
src/ui/theme.ts                   Light/dark tokens, useTheme()
src/ui/Notice.tsx                 Toast-style notices, useNotice()
src/ui/Poster.tsx                 Authenticated poster image with placeholder
src/ui/Banners.tsx                SampleBanner, StaleBanner
src/ui/useLayout.ts               columns / maxContentWidth from window width
test/render.tsx                   renderWithProviders(ui, { api, mode })
test/fakeApi.ts                   createFakeApi(overrides): jest-mocked SonarrApi
.github/workflows/release.yml     Tag v* → test, build signed APK + AAB, attach APK to release
docs/RELEASING.md                 Keys, Android/iOS builds, store notes, device checklist
README.md                         Rewritten
```

---

### Task 1: Replace the old app with an Expo scaffold

**Files:**
- Delete: `index.html`, `metadata.json`, `server.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`, `.env.example`, `src/` (all), `public/` (all, including `sonarr-android.apk`), `scripts/build-apk.sh`, `.github/workflows/build-apk.yml`
- Create: Expo project files at repo root, `app.config.ts`, `app/_layout.tsx` (placeholder), `jest.config.js`, `jest.setup.ts`
- Modify: `.gitignore` (add `node_modules/`, `.expo/`, `ios/`, `android/`, `*.keystore`, `*.jks`, keep `.superpowers/`)
- Test: `__tests__/appConfig.test.ts`

**Interfaces:**
- Produces: `npm test` (jest-expo), `npm run typecheck` (`tsc --noEmit`), `npm run lint` (`expo lint`); `app.config.ts` exporting the config with `APP_ID = 'com.remoteforsonarr.app'`.

- [ ] **Step 1:** Run `git rm -r` on the delete list above and commit (`chore: remove web app`).
- [ ] **Step 2:** Scaffold in the scratch dir with `npx create-expo-app@latest rfs --template default`, copy its files to the repo root (skip its README), then run `npx expo install` for the Tech Stack packages plus `npm i -D jest-expo @testing-library/react-native @types/jest`. Remove the template's example screens/components. Use the strict TS config from the template.
- [ ] **Step 3: Write the failing test** `__tests__/appConfig.test.ts`:

```ts
import config from '../app.config';
const c = config({ config: {} } as any) as any;
test('identity', () => {
  expect(c.name).toBe('Remote for Sonarr');
  expect(c.ios.bundleIdentifier).toBe('com.remoteforsonarr.app');
  expect(c.android.package).toBe('com.remoteforsonarr.app');
});
test('ios allows http to user hosts and explains local network', () => {
  expect(c.ios.infoPlist.NSAppTransportSecurity).toEqual({ NSAllowsArbitraryLoads: true });
  expect(c.ios.infoPlist.NSLocalNetworkUsageDescription).toMatch(/Sonarr server on your home network or VPN/);
});
test('android allows cleartext via expo-build-properties', () => {
  const bp = c.plugins.find((p: any) => Array.isArray(p) && p[0] === 'expo-build-properties');
  expect(bp[1].android.usesCleartextTraffic).toBe(true);
});
test('no over-the-air updates', () => {
  expect(JSON.stringify(c.plugins)).not.toMatch(/expo-updates/);
  expect(c.updates?.enabled ?? false).toBe(false);
});
```

- [ ] **Step 4:** Run `npm test -- appConfig`. Expected: FAIL.
- [ ] **Step 5: Write `app.config.ts`** (`export default ({ config }: ConfigContext): ExpoConfig`) with `userInterfaceStyle: 'automatic'`, `scheme: 'remoteforsonarr'`, the plugins `expo-router`, `expo-secure-store`, `expo-localization`, `['expo-build-properties', { android: { usesCleartextTraffic: true } }]`, `updates: { enabled: false }`, `ios.infoPlist` as tested plus `ITSAppUsesNonExemptEncryption: false`. Use this exact `NSLocalNetworkUsageDescription`: `"Remote for Sonarr connects to your Sonarr server on your home network or VPN."`
- [ ] **Step 6:** Run `npm test && npm run typecheck && npm run lint`. Expected: PASS.
- [ ] **Step 7:** Run `npx expo start` and open it in Expo Go on a phone or simulator. Expected: the placeholder screen renders.
- [ ] **Step 8:** Commit (`feat: scaffold Expo app`).

---

### Task 2: API core — URL normalization, errors, connection test

**Files:**
- Create: `src/api/url.ts`, `src/api/errors.ts`, `src/api/types.ts` (types needed so far), `src/api/liveApi.ts`
- Test: `src/api/__tests__/url.test.ts`, `src/api/__tests__/liveApi.core.test.ts`

**Interfaces:**
- Produces:
  - `normalizeBaseUrl(input: string): string` throws `SonarrError('invalid-url')`
  - `type SonarrErrorKind = 'invalid-url' | 'unreachable' | 'timeout' | 'unauthorized' | 'not-sonarr' | 'unsupported-version' | 'http'`
  - `class SonarrError extends Error { kind: SonarrErrorKind; status?: number; https?: boolean }`
  - `userMessage(e: unknown): { title: string; detail: string }`
  - `type ConnectionConfig = { baseUrl: string; apiKey: string }`
  - `type SystemStatus = { appName: string; version: string }`
  - `createLiveApi(config: ConnectionConfig, fetchImpl?: typeof fetch): SonarrApi` (only `testConnection(): Promise<SystemStatus>` in this task)
  - internal `request<T>(path: string, init?: { method?: string; query?: Record<string, string | number | boolean | undefined>; body?: unknown; timeoutMs?: number }): Promise<T>`, default `timeoutMs` 15000

- [ ] **Step 1: Write failing tests** `url.test.ts`:

```ts
test.each([
  ['192.168.1.50:8989', 'http://192.168.1.50:8989'],
  ['http://192.168.1.50:8989/', 'http://192.168.1.50:8989'],
  ['  HTTP://NAS.local:8989  ', 'http://nas.local:8989'],
  ['https://example.com/sonarr/', 'https://example.com/sonarr'],
  ['http://host:8989/sonarr/api/v3', 'http://host:8989/sonarr'],
])('normalizes %s', (i, o) => expect(normalizeBaseUrl(i)).toBe(o));
test.each(['', 'ftp://x', 'http://', 'not a url'])('rejects %p', (i) =>
  expect(() => normalizeBaseUrl(i)).toThrow(expect.objectContaining({ kind: 'invalid-url' })));
```

`liveApi.core.test.ts` (mock `fetchImpl` with `jest.fn`):
- `sends X-Api-Key header, trimmed key, to /api/v3/system/status` asserts that a key of `' abc '` sends the header `'abc'`, the URL is `http://h:8989/api/v3/system/status`, and nothing in the URL contains `apikey`.
- `returns status for Sonarr v3 and v4` covers `{appName:'Sonarr',version:'3.0.10.1567'}` and `'4.0.9.2244'`.
- `unsupported-version for v2 / v5` covers `version:'5.0.0.1'`, which rejects with kind `unsupported-version`.
- `not-sonarr when appName differs or body is HTML` covers `{appName:'Radarr'}` and a 200 `text/html` body.
- `not-sonarr on 404` and `unauthorized on 401 and 403`.
- `unreachable when fetch rejects` with `https: true` set when baseUrl starts with `https://`.
- `timeout after timeoutMs` uses fake timers. The fetch never resolves, so after 15000ms it rejects with kind `timeout`.
- `http with status for other 4xx/5xx` covers a 500 → `{kind:'http', status:500}`.
- `userMessage` copy for `unreachable`, http and https:

```ts
expect(userMessage(new SonarrError('unreachable'))).toEqual({
  title: "Can't reach Sonarr",
  detail: 'Check the address and port, and make sure your phone is on your home network or VPN.' });
expect(userMessage(Object.assign(new SonarrError('unreachable'), { https: true })).detail)
  .toMatch(/self-signed certificates aren't supported/);
```

- [ ] **Step 2:** Run `npm test -- src/api`. Expected: FAIL.
- [ ] **Step 3: Implement.** `normalizeBaseUrl` trims the input, adds `http://` when there's no scheme, accepts only http/https with a host, lowercases scheme and host, strips a trailing `/` and a trailing `/api/v3` or `/api`, and keeps any base path. `request` builds the URL from `baseUrl + '/api/v3' + path` plus the query (skipping `undefined` values), sends JSON, aborts via `AbortController` after `timeoutMs`, maps errors as tested, and returns `undefined` for 204 or an empty body. The other `userMessage` copy:
  - `invalid-url`: "That address doesn't look right" / "Use something like http://192.168.1.50:8989"
  - `unauthorized`: "API key was rejected" / "Copy it from Sonarr → Settings → General → Security."
  - `not-sonarr`: "That isn't a Sonarr server" / "Check the port and any URL base (like /sonarr)."
  - `unsupported-version`: "Unsupported Sonarr version" / "This app supports Sonarr v3 and v4."
  - `timeout`: "Sonarr took too long to answer" / same detail as unreachable
  - `http`: "Sonarr returned an error" / `HTTP ${status}`
  - https unreachable detail: "Check the address and that you're on your home network or VPN. If your server uses HTTPS, self-signed certificates aren't supported."
- [ ] **Step 4:** Run `npm test -- src/api`. Expected: PASS.
- [ ] **Step 5:** Commit (`feat(api): url normalization, errors, connection test`).

---

### Task 3: Full Sonarr API surface

**Files:**
- Modify: `src/api/types.ts`, `src/api/liveApi.ts`
- Test: `src/api/__tests__/liveApi.endpoints.test.ts`

**Interfaces:**
- Produces, in `types.ts` (the DTO subsets have only the fields the screens use, and optional fields are marked `?`):
  - `Image { coverType: 'poster'|'fanart'|'banner'; remoteUrl?: string }`
  - `Season { seasonNumber: number; monitored: boolean; statistics?: { episodeFileCount: number; episodeCount: number; totalEpisodeCount: number } }`
  - `Series { id: number; title: string; sortTitle?: string; year?: number; network?: string; status: 'continuing'|'ended'|'upcoming'|'deleted'; monitored: boolean; qualityProfileId: number; seriesType: SeriesType; path?: string; images: Image[]; seasons: Season[]; nextAiring?: string; statistics?: { episodeFileCount: number; episodeCount: number; totalEpisodeCount: number; percentOfEpisodes: number; seasonCount: number } }`
  - `LookupSeries = Omit<Series,'id'|'qualityProfileId'> & { id?: number; tvdbId: number; remotePoster?: string; overview?: string }` (`id` is present when already added)
  - `Episode { id: number; seriesId: number; seasonNumber: number; episodeNumber: number; title?: string; airDateUtc?: string; hasFile: boolean; monitored: boolean; episodeFile?: { quality: { quality: { name: string } } }; series?: Series }`
  - `SeriesType = 'standard'|'daily'|'anime'`; `MonitorOption = 'all'|'future'|'missing'|'existing'|'pilot'|'firstSeason'|'none'`
  - `RootFolder { id: number; path: string; freeSpace?: number }`, `QualityProfile { id: number; name: string }`
  - `Paged<T> { page: number; pageSize: number; totalRecords: number; records: T[] }`
  - `QueueItem { id: number; seriesId?: number; episodeId?: number; title: string; size?: number; sizeleft?: number; timeleft?: string; status: string; trackedDownloadStatus?: 'ok'|'warning'|'error'; trackedDownloadState?: string; statusMessages?: { title: string; messages: string[] }[]; errorMessage?: string; quality?: { quality: { name: string } }; protocol?: 'usenet'|'torrent'; series?: Series; episode?: Episode }`
  - `HistoryItem { id: number; eventType: string; date: string; sourceTitle: string; seriesId: number; episodeId: number; quality?: { quality: { name: string } }; series?: Series; episode?: Episode }`
  - `Release { guid: string; indexerId: number; indexer?: string; title: string; size: number; ageHours?: number; quality: { quality: { name: string; resolution?: number } }; protocol: 'usenet'|'torrent'; seeders?: number; leechers?: number; releaseGroup?: string; languages?: { name: string }[]; rejected: boolean; rejections: string[] }`
  - `AddSeriesInput { lookup: LookupSeries; rootFolderPath: string; qualityProfileId: number; monitor: MonitorOption; seriesType: SeriesType; searchForMissingEpisodes: boolean }`
  - ```ts
    interface SonarrApi {
      testConnection(): Promise<SystemStatus>;
      getSeries(): Promise<Series[]>;
      getSeriesById(id: number): Promise<Series>;
      updateSeries(s: Series): Promise<Series>;               // PUT /series/{id}
      deleteSeries(id: number, deleteFiles: boolean): Promise<void>;
      lookupSeries(term: string): Promise<LookupSeries[]>;
      addSeries(input: AddSeriesInput): Promise<Series>;
      getRootFolders(): Promise<RootFolder[]>;
      getQualityProfiles(): Promise<QualityProfile[]>;
      getEpisodes(seriesId: number): Promise<Episode[]>;
      setEpisodesMonitored(ids: number[], monitored: boolean): Promise<void>;
      getCalendar(startUtc: string, endUtc: string): Promise<Episode[]>;
      getQueue(page: number, pageSize: number): Promise<Paged<QueueItem>>;
      removeQueueItem(id: number, opts: { blocklist: boolean; removeFromClient: boolean }): Promise<void>;
      getHistory(page: number, pageSize: number): Promise<Paged<HistoryItem>>;
      searchEpisodes(episodeIds: number[]): Promise<void>;
      searchSeason(seriesId: number, seasonNumber: number): Promise<void>;
      getReleases(q: { episodeId: number } | { seriesId: number; seasonNumber: number }, signal?: AbortSignal): Promise<Release[]>;
      grabRelease(r: Pick<Release,'guid'|'indexerId'>): Promise<void>;
      posterSource(seriesId: number): { uri: string; headers?: Record<string,string> } | null;
    }
    ```

- [ ] **Step 1: Write failing tests.** Have one test per method that asserts method, path, query, and body against a mocked fetch:
  - `getSeries` → `GET /api/v3/series`
  - `deleteSeries(5,true)` → `DELETE /api/v3/series/5?deleteFiles=true`
  - `lookupSeries('the bear')` → `GET /api/v3/series/lookup?term=the%20bear`
  - `addSeries` → `POST /api/v3/series` with a body containing the lookup fields plus `{ rootFolderPath, qualityProfileId, seriesType, monitored: true, seasonFolder: true, addOptions: { monitor, searchForMissingEpisodes } }`. `monitor:'none'` sends `monitored: false`.
  - `getEpisodes(7)` → `GET /api/v3/episode?seriesId=7&includeEpisodeFile=true`
  - `setEpisodesMonitored([1,2],false)` → `PUT /api/v3/episode/monitor` with `{episodeIds:[1,2],monitored:false}`
  - `getCalendar(a,b)` → `GET /api/v3/calendar?start=a&end=b&includeSeries=true&unmonitored=false`
  - `getQueue(1,50)` → `GET /api/v3/queue?page=1&pageSize=50&includeSeries=true&includeEpisode=true`
  - `removeQueueItem(9,{blocklist:true,removeFromClient:false})` → `DELETE /api/v3/queue/9?removeFromClient=false&blocklist=true`
  - `getHistory(2,50)` → `GET /api/v3/history?page=2&pageSize=50&sortKey=date&sortDirection=descending&includeSeries=true&includeEpisode=true`
  - `searchEpisodes([3])` → `POST /api/v3/command` with `{name:'EpisodeSearch',episodeIds:[3]}`. `searchSeason(7,2)` → `{name:'SeasonSearch',seriesId:7,seasonNumber:2}`
  - `getReleases({episodeId:3})` → `GET /api/v3/release?episodeId=3` with `timeoutMs` 120000 and the caller's signal passed through. The season variant uses `?seriesId=7&seasonNumber=2`.
  - `grabRelease` → `POST /api/v3/release` with `{guid,indexerId}`
  - `posterSource(7)` → `{ uri: 'http://h:8989/api/v3/mediacover/7/poster-250.jpg', headers: { 'X-Api-Key': 'abc' } }`
- [ ] **Step 2:** Run `npm test -- liveApi.endpoints`. Expected: FAIL.
- [ ] **Step 3:** Implement each method in `createLiveApi` on top of `request`. Have `getReleases` combine its signal with the timeout signal.
- [ ] **Step 4:** Run `npm test -- src/api`. Expected: PASS.
- [ ] **Step 5:** Commit (`feat(api): Sonarr v3/v4 endpoints`).

---

### Task 4: Connection, query cache, stale state, sample mode

**Files:**
- Create: `src/connection/storage.ts`, `src/connection/ConnectionProvider.tsx`, `src/query/QueryProvider.tsx`, `src/query/hooks.ts`, `src/sample/fixtures.ts`, `src/sample/sampleApi.ts`, `src/ui/Notice.tsx`, `src/ui/theme.ts`, `src/ui/Banners.tsx`, `test/render.tsx`, `test/fakeApi.ts`
- Modify: `app/_layout.tsx`, `jest.setup.ts` (mock secure-store with an in-memory map, plus the async-storage jest mock)
- Test: `src/connection/__tests__/storage.test.ts`, `src/sample/__tests__/sampleApi.test.ts`, `src/query/__tests__/hooks.test.tsx`

**Interfaces:**
- Consumes: `SonarrApi`, `ConnectionConfig`, `createLiveApi`, `SonarrError`.
- Produces:
  - `loadConnection(): Promise<ConnectionState>`, `saveLive(c: ConnectionConfig)`, `saveSample()`, `clearConnection()`. Secure-store keys `rfs.baseUrl` and `rfs.apiKey`, plus a non-secret AsyncStorage `rfs.mode` = `'live'|'sample'`.
  - `type ConnectionState = { mode: 'none' } | { mode: 'live'; config: ConnectionConfig } | { mode: 'sample' }`
  - `useConnection(): { state: ConnectionState; api: SonarrApi | null; setLive(c): Promise<void>; setSample(): Promise<void>; disconnect(): Promise<void> }`
  - `createSampleApi(now: () => Date): SonarrApi`. Reads come from fixtures, mutations resolve without changing anything, and `getReleases` resolves after 800ms.
  - `useSonarrQuery<T>(key: unknown[], fn: (api: SonarrApi) => Promise<T>, opts?: { refetchInterval?: number; enabled?: boolean }): { data?: T; isLoading: boolean; error?: SonarrError; isStale: boolean; refetch(): void }`. `isStale` is true when `data` exists and the last fetch failed with `unreachable` or `timeout`.
  - `useSonarrMutation<V>(fn: (api: SonarrApi, v: V) => Promise<unknown>, opts: { successMessage: string; invalidate: unknown[][] }): { run(v: V): Promise<void>; isRunning: boolean }`. In sample mode it shows `"Sample data — nothing was changed."` instead of `successMessage`. On error it shows `userMessage(e).title`.
  - `useNotice(): { show(text: string): void }`, `useTheme(): Theme` (tokens `bg, surface, text, muted, accent, danger, warning, success, border`)
  - `<SampleBanner/>` (shown whenever mode is sample, with the text "Sample data — not connected to a server") and `<StaleBanner/>` (text "Can't reach Sonarr — showing saved data")
  - `renderWithProviders(ui, { api?: Partial<SonarrApi>; mode?: 'live'|'sample' })`, `createFakeApi(overrides?: Partial<SonarrApi>): jest.Mocked<SonarrApi>`
- Query cache: one `QueryClient` per connection, with `gcTime` 7 days and `staleTime` 30s. It's persisted with the async-storage persister under the key `rfs.cache.${baseUrl}` in live mode, and never persisted in sample mode. Changing or clearing the connection drops the client and deletes the old cache key. Use `focusManager` and `onlineManager` from TanStack, wired to `AppState`.

- [ ] **Step 1: Write failing tests.**
  - `storage.test.ts`: `saveLive` then `loadConnection` returns the config. The API key isn't present in any AsyncStorage value (`AsyncStorage.getAllKeys` + `multiGet` never contain `'abc'`). `clearConnection` returns `{mode:'none'}`.
  - `sampleApi.test.ts`: `getSeries` returns ≥ 6 series with fictional titles, including one with 3 missing episodes, one ended, and one with no images. `getCalendar` for the week containing `now` returns ≥ 1 episode on ≥ 3 different days. `getQueue` has one downloading item and one `trackedDownloadStatus:'warning'` item with a stalled message. `getReleases({episodeId})` returns ≥ 8 releases with ≥ 2 rejected and both 1080p and 2160p present. `removeQueueItem` resolves, and the queue afterwards is unchanged.
  - `hooks.test.tsx`: `isStale true after a failed refetch with cached data` (the first call resolves and the second rejects `unreachable`, which gives `data` still set and `isStale` true, and `<StaleBanner/>` renders). `sample mutation shows sample notice` (mode sample, so `run()` shows the sample text and not the successMessage).
- [ ] **Step 2:** Run `npm test -- src/connection src/sample src/query`. Expected: FAIL.
- [ ] **Step 3: Implement.** Sample fixtures use fictional shows (e.g. "Harbor Lights", "The Quiet Office", "Starfall") and timestamps computed from `now()`. `app/_layout.tsx` wraps the app in `ThemeProvider > NoticeProvider > ConnectionProvider > QueryProvider`, shows a splash while loading the connection, and redirects to `/server` when the mode is `none`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit (`feat: connection, persisted query cache, sample mode`).

---

### Task 5: Server screen and first run

**Files:**
- Create: `app/server.tsx`
- Test: `app/__tests__/server.test.tsx`

**Interfaces:**
- Consumes: `useConnection`, `normalizeBaseUrl`, `createLiveApi(...).testConnection`, `userMessage`.

- [ ] **Step 1: Write failing tests:**
  - `test then save connects`: type `192.168.1.50:8989` and the key, then tap **Test**, which shows `Connected to Sonarr 4.0.9`. Tap **Save**, and `setLive` is called with `{baseUrl:'http://192.168.1.50:8989', apiKey:'abc'}`, then it navigates to the tabs.
  - `save is disabled until a test succeeds for the current values` (editing the URL after a successful test disables it again).
  - `shows error copy` (an `unauthorized` rejection shows "API key was rejected" and its detail).
  - `explore with sample data`: tapping **Explore with sample data** calls `setSample`.
  - `editing existing connection prefills URL, masks key, offers Disconnect` (in live mode the key field is `secureTextEntry`, and **Disconnect** asks for confirmation and then calls `disconnect`).
- [ ] **Step 2:** Run `npm test -- server`. Expected: FAIL.
- [ ] **Step 3:** Implement. Use the field labels "Server address" (placeholder `http://192.168.1.50:8989`) and "API key", with the helper text "Find it in Sonarr → Settings → General → Security." Disable autocorrect and autocapitalize on both fields. Leave out any other settings.
- [ ] **Step 4:** Run `npm test -- server`. Expected: PASS.
- [ ] **Step 5:** Commit (`feat: server screen and first run`).

---

### Task 6: Tabs, Poster, layout, and the Shows screen

**Files:**
- Create: `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `src/ui/Poster.tsx`, `src/ui/useLayout.ts`, `src/domain/series.ts`, `src/domain/format.ts`
- Test: `src/domain/__tests__/series.test.ts`, `app/__tests__/shows.test.tsx`

**Interfaces:**
- Produces:
  - `seriesSummary(s: Series, now: Date): { counts: string; status: { kind: 'missing'; count: number } | { kind: 'next'; at: string } | { kind: 'ended' } | { kind: 'none' }; progress: number }`
  - `formatAirTime(iso: string, now: Date, tz?: string): string`. Within the next 7 days it gives `'Thu 9:00 PM'`. Today it gives `'Today 9:00 PM'`. Otherwise it gives `'Nov 12'`. The device locale and time zone are the defaults, and `tz` is for tests.
  - `formatBytes(n?: number): string` (`3.2 GB`, and `—` when undefined)
  - `useLayout(): { columns: number; maxContentWidth: number; isWide: boolean }`. Below 600dp it's 1 column, rows, and full width. At 600dp and up it's `Math.floor(width / 180)` poster columns and `maxContentWidth` 1100.
  - `<Poster seriesId size="small"|"large" title />`, which uses `api.posterSource`, falls back to a colored block with initials on error or null, and never crashes.

- [ ] **Step 1: Write failing tests** `series.test.ts`:

```ts
const base = { statistics: { episodeFileCount: 14, episodeCount: 18, totalEpisodeCount: 20, percentOfEpisodes: 77.8, seasonCount: 2 }, status: 'continuing' } as any;
const now = new Date('2026-10-30T12:00:00Z');
test('missing wins', () => expect(seriesSummary(base, now)).toMatchObject({ counts: '14/18 episodes', status: { kind: 'missing', count: 4 }, progress: 14/18 }));
test('next airing when complete', () => expect(seriesSummary({ ...base, statistics: { ...base.statistics, episodeFileCount: 18 }, nextAiring: '2026-10-31T01:00:00Z' }, now).status).toEqual({ kind: 'next', at: '2026-10-31T01:00:00Z' }));
test('ended', () => expect(seriesSummary({ ...base, status: 'ended', statistics: { ...base.statistics, episodeFileCount: 18 } }, now).status).toEqual({ kind: 'ended' }));
test('no statistics', () => expect(seriesSummary({ status: 'continuing' } as any, now)).toEqual({ counts: '0/0 episodes', status: { kind: 'none' }, progress: 0 }));
```

  `shows.test.tsx`:
  - `lists series sorted by sortTitle`
  - `filters by search text` (case-insensitive, and "harbor" matches "Harbor Lights")
  - `tapping a row opens /series/[id]`
  - `+ opens /add`
  - `gear opens /server`
  - `renders 1000 series without rendering all rows` (the FlatList renders fewer than 100 rows initially)
  - `empty library shows "No shows yet" with an Add button`
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement.** The tabs are Shows, Calendar, and Activity (the last two are stubs until their tasks), with icons from `@expo/vector-icons`. The Shows header has a search field, a gear (→ `/server`), and a FAB `+` (→ `/add`). Pull to refresh. On phones each row shows a poster, title, counts, a status line colored by kind (missing → danger), and a progress bar. Wide screens get a poster grid. Show `<SampleBanner/>` and `<StaleBanner/>` above the list.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit (`feat: shows tab`).

---

### Task 7: Show detail

**Files:**
- Create: `app/series/[id].tsx`
- Modify: `src/domain/series.ts` (add `episodeStatus`, `groupSeasons`)
- Test: `src/domain/__tests__/episodes.test.ts`, `app/__tests__/seriesDetail.test.tsx`

**Interfaces:**
- Produces:
  - `episodeStatus(e: Episode, now: Date): { kind: 'downloaded'; quality?: string } | { kind: 'missing' } | { kind: 'unaired'; at?: string } | { kind: 'unmonitored' }`. If `hasFile` it's downloaded. If there's no `airDateUtc` or the air date is in the future, it's unaired (with `at` undefined for TBA). Otherwise it's missing when monitored and unmonitored when not.
  - `groupSeasons(series: Series, episodes: Episode[]): { seasonNumber: number; title: string; monitored: boolean; have: number; total: number; episodes: Episode[] }[]`. Seasons sort newest first with Specials (season 0, titled "Specials") last. Episodes within a season sort descending.
- Consumes: `useSonarrQuery`, `useSonarrMutation`, `api.getSeriesById/getEpisodes/updateSeries/setEpisodesMonitored/searchEpisodes/searchSeason/deleteSeries`.

- [ ] **Step 1: Write failing tests:**
  - `episodes.test.ts` covers the four `episodeStatus` branches including TBA, plus `groupSeasons` with seasons [0,1,2], which gives order [2,1,0], season 0 titled "Specials", and correct have/total.
  - `seriesDetail.test.tsx`:
    - `only newest season expanded by default`
    - `episode search calls searchEpisodes([id]) and shows "Search started"`
    - `season search calls searchSeason`
    - `"Pick a release" on episode navigates to /releases?episodeId=` and the season variant goes to `?seriesId=&seasonNumber=`
    - `toggle season monitored PUTs series with that season flipped`
    - `toggle episode monitored calls setEpisodesMonitored`
    - `delete asks confirmation with "Also delete files" option, then deleteSeries(id, true) and navigates back`
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement.** The header has a large poster, title, year/network, monitored toggle, quality profile name (from `getQualityProfiles`), and season count. Seasons are collapsible sections. Each episode row shows the number, title, and a status chip, and tapping its action icon opens a small sheet with **Search**, **Pick a release**, and **Monitor/Unmonitor**. The season header has the same actions for the whole season. **Delete show** sits at the bottom of the screen.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit (`feat: show detail`).

---

### Task 8: Add show

**Files:**
- Create: `app/add.tsx`, `src/domain/addDefaults.ts`
- Test: `src/domain/__tests__/addDefaults.test.ts`, `app/__tests__/add.test.tsx`

**Interfaces:**
- Produces:
  - `loadAddDefaults(baseUrlOrSample: string): Promise<Partial<AddDefaults>>` and `saveAddDefaults(key, d: AddDefaults)`. These use AsyncStorage key `rfs.addDefaults.${key}`, where `AddDefaults = { rootFolderPath: string; qualityProfileId: number; monitor: MonitorOption; seriesType: SeriesType; searchForMissingEpisodes: boolean }`.
  - `resolveAddDefaults(saved: Partial<AddDefaults>, folders: RootFolder[], profiles: QualityProfile[]): AddDefaults`. It drops saved folders or profiles that no longer exist. The fallbacks are the first folder, the first profile, `monitor:'all'`, `seriesType:'standard'`, and `searchForMissingEpisodes:true`.

- [ ] **Step 1: Write failing tests:**
  - `addDefaults.test.ts` covers `stale saved folder falls back to first` and `valid saved values kept`.
  - `add.test.tsx`:
    - `search is debounced 400ms and calls lookupSeries`
    - `already-added result shows "In library" and opens its detail instead`
    - `choosing a result shows options prefilled from defaults`
    - `"Add & search" calls addSeries with chosen options, saves defaults, navigates to /series/[newId]`
    - `with search off, button reads "Add"`
    - `no root folders shows "Add a root folder in Sonarr first"` with the add button disabled
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement.** Results show `remotePoster` via `expo-image`, which loads straight from the image host with no Sonarr auth, plus title, year, and network. The options are Folder (picker), Quality (picker), Monitor (All, Future, Missing, Existing, Pilot, First season, None), Series type (Standard, Daily, Anime), and a "Search for missing episodes" switch.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit (`feat: add show`).

---

### Task 9: Calendar (week strip + day)

**Files:**
- Create: `src/domain/calendar.ts`
- Modify: `app/(tabs)/calendar.tsx`
- Test: `src/domain/__tests__/calendar.test.ts`, `app/__tests__/calendar.test.tsx`

**Interfaces:**
- Produces:
  - `buildWeek(anchor: Date, firstWeekday: 1|2|3|4|5|6|7, tz: string): { days: { key: string /* 'YYYY-MM-DD' local */; label: string /* 'T' */; dayOfMonth: number }[]; startUtc: string; endUtc: string }`. `firstWeekday` uses the `expo-localization` convention (1 = Sunday).
  - `groupByLocalDay(episodes: Episode[], tz: string): Record<string, Episode[]>`, sorted by air time. Episodes without `airDateUtc` are left out.
  - `localDayKey(iso: string, tz: string): string`

- [ ] **Step 1: Write failing tests** `calendar.test.ts`:

```ts
test('UTC early-morning airs on previous local day', () =>
  expect(localDayKey('2026-10-31T01:00:00Z', 'America/New_York')).toBe('2026-10-30'));
test('week starts on device first weekday (Sunday)', () =>
  expect(buildWeek(new Date('2026-10-30T12:00:00Z'), 1, 'America/New_York').days.map(d => d.key))
    .toEqual(['2026-10-25','2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31']));
test('Monday start', () =>
  expect(buildWeek(new Date('2026-10-30T12:00:00Z'), 2, 'Europe/Berlin').days[0].key).toBe('2026-10-26'));
test('DST week still has 7 days and covers full local range', () => {
  const w = buildWeek(new Date('2026-11-03T12:00:00Z'), 1, 'America/New_York'); // DST ends Nov 1
  expect(w.days).toHaveLength(7);
  expect(w.startUtc).toBe('2026-11-01T04:00:00.000Z');
  expect(w.endUtc).toBe('2026-11-08T05:00:00.000Z');
});
test('groups and skips TBA', () => { /* 3 episodes, one without airDateUtc → 2 grouped */ });
```

  `calendar.test.tsx`:
  - `opens on today with today selected`
  - `days with episodes show a dot`
  - `tap a day lists its episodes with local time and status`
  - `swipe/next arrow loads next week via getCalendar(startUtc,endUtc)`
  - `"Today" button returns to current week`
  - `tapping an episode opens /series/[seriesId]`
  - `empty day shows "Nothing airing"`
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement.** Use `Intl.DateTimeFormat` with `timeZone` to compute local dates, and don't add a date library unless Hermes `Intl` turns out to be missing time zone support. If it is, add `date-fns-tz` and note it in the PR. The strip is a horizontal pager of weeks with prev/next arrows. Rows show the poster, show title, `S02E09`, the episode title, the time, and the `episodeStatus` chip.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit (`feat: calendar`).

---

### Task 10: Activity — queue and history

**Files:**
- Create: `src/domain/queue.ts`
- Modify: `app/(tabs)/activity.tsx`
- Test: `src/domain/__tests__/queue.test.ts`, `app/__tests__/activity.test.tsx`

**Interfaces:**
- Produces:
  - `queueItemView(q: QueueItem): { title: string; subtitle: string; progress: number | null; timeLeft: string | null; tone: 'normal'|'warning'|'error'; messages: string[] }`. The title is the series title when present, otherwise `q.title`. The subtitle is `S01E02 · quality · size` with missing parts dropped. Progress is `(size - sizeleft) / size`, or null when the size is unknown or 0. `timeLeft` turns `'00:04:12'` into `'4 min'` and `'1.02:00:00'` into `'1 d 2 h'`. Tone comes from `trackedDownloadStatus` and `errorMessage`. The messages flatten `statusMessages` plus `errorMessage`.
  - `historyEventLabel(eventType: string): string`. `grabbed` gives "Grabbed", `downloadFolderImported` gives "Imported", `downloadFailed` gives "Failed", `episodeFileDeleted` gives "Deleted", and anything else gives the type in Title Case.

- [ ] **Step 1: Write failing tests:**
  - `queue.test.ts` covers a normal item, a stalled warning, an item with no episode/size/timeleft (progress null, no crash), and the timeleft formats above.
  - `activity.test.tsx`:
    - `queue polls every 5s while focused` (fake timers, ≥ 2 calls after 10s)
    - `Remove asks to confirm with "Also remove from download client" switch (default on) then removeQueueItem(id,{blocklist:false,removeFromClient:true})`
    - `"Remove + block" sends blocklist:true`
    - `empty queue shows "Nothing downloading"`
    - `History tab loads page 1 of 50 and loads page 2 on end reached, stopping at totalRecords`
    - `history row shows label, series, SxxEyy, quality, relative date`
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement.** The screen has a Queue | History segmented control showing the queue count. The queue uses `useSonarrQuery(['queue'], …, { refetchInterval: 5000 })` and only polls while the tab is focused and the app is in the foreground. History uses `useInfiniteQuery` with pageSize 50. Warning and error items show their messages inline, colored by tone.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit (`feat: activity queue and history`).

---

### Task 11: Interactive search (short rows, tap for more)

**Files:**
- Create: `app/releases.tsx`, `src/domain/releases.ts`
- Test: `src/domain/__tests__/releases.test.ts`, `app/__tests__/releases.test.tsx`

**Interfaces:**
- Produces:
  - `type ReleaseSort = 'sonarr'|'size'|'seeders'|'age'`
  - `resolutionChips(rs: Release[]): number[]` gives the distinct `quality.quality.resolution` values above 0, sorted ascending and shown as `1080p` etc.
  - `filterReleases(rs, { resolution?: number; hideRejected: boolean }): Release[]`
  - `sortReleases(rs, sort: ReleaseSort): Release[]` is stable. `sonarr` keeps the input order. `size` and `seeders` sort descending, with undefined seeders last. `age` sorts ascending by `ageHours`.

- [ ] **Step 1: Write failing tests:**
  - `releases.test.ts` covers chips from mixed releases (including resolution 0 and undefined, which are skipped), hide rejected, the resolution filter, each sort, and missing `seeders` sorting last.
  - `releases.test.tsx`:
    - `shows progress text "Searching indexers…" and Cancel aborts the signal and goes back`
    - `rows show quality, size, seeders (torrent only), group; rejected rows dimmed with ⚠`
    - `tapping a row expands full title, indexer, age, languages, rejection reasons, and Grab`
    - `Grab calls grabRelease({guid,indexerId}) and shows "Sent to download client"`
    - `grabbing a rejected release asks to confirm first`
    - `header shows "23 releases"` (the count after filtering)
    - `no results shows "No releases found"`
    - `error shows userMessage title with Retry`
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement.** Read `episodeId` or `seriesId` + `seasonNumber` from the route params. The title is the series name and `S02E08` (or `Season 2`). The filter chips are All, each resolution, Hide rejected, and a Sort menu. Only one row is expanded at a time.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit (`feat: interactive release search`).

---

### Task 12: Release builds, signing, docs, and device verification

**Files:**
- Create: `plugins/withAndroidReleaseSigning.js`, `.github/workflows/release.yml`, `docs/RELEASING.md`
- Modify: `app.config.ts` (register the plugin), `README.md` (rewrite)
- Test: `plugins/__tests__/withAndroidReleaseSigning.test.js`

**Interfaces:**
- Produces: `applyReleaseSigning(buildGradle: string): string`, exported for tests. It adds a `release` signingConfig that reads env vars `RFS_KEYSTORE_PATH`, `RFS_KEYSTORE_PASSWORD`, `RFS_KEY_ALIAS`, and `RFS_KEY_PASSWORD`, and points `buildTypes.release.signingConfig` to it. If the env vars aren't set it falls back to debug signing so local dev builds still work. It's idempotent.

- [ ] **Step 1: Write failing tests.** Using the template's generated `android/app/build.gradle` as a fixture (copied into `plugins/__tests__/fixtures/`), check that the output contains `signingConfigs { ... release {` with the 4 env reads and `release { ... signingConfig signingConfigs.release`, and that applying it twice gives the same output.
- [ ] **Step 2:** Run `npm test -- plugins`. Expected: FAIL.
- [ ] **Step 3:** Implement the plugin with `withAppBuildGradle` and register it in `app.config.ts`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Write `.github/workflows/release.yml`.** It runs on `push: tags: ['v*']`. Steps: `actions/checkout@v4`, `actions/setup-node@v4` (node 22, npm cache), `actions/setup-java@v4` (temurin 17), `npm ci`, `npm test`, `npm run typecheck`, `npx expo prebuild -p android --no-install`, decode the `RFS_KEYSTORE_BASE64` secret into `$RUNNER_TEMP/rfs.jks`, then `./gradlew assembleRelease bundleRelease` in `android/`. Finally run `gh release create "$GITHUB_REF_NAME" android/app/build/outputs/apk/release/app-release.apk#remote-for-sonarr-$GITHUB_REF_NAME.apk --generate-notes` and upload the AAB as a workflow artifact for Play. Set `permissions: contents: write`.
- [ ] **Step 6: Write `docs/RELEASING.md`** with these sections:
  1. **One-time: the shared signing key.** Use `keytool -genkeypair -v -keystore rfs.jks -alias rfs -keyalg RSA -keysize 4096 -validity 10000`, back it up offline, add the 5 GitHub secrets, and in Play Console → App signing choose "Use your own key" and upload it with Google's PEPK tool *before the first release*. Warn that this is permanent.
  2. **Releasing Android:** bump `version` and `android.versionCode`, tag `vX.Y.Z`, then CI attaches the APK and you upload the AAB artifact to Play.
  3. **Releasing iOS (on the Mac):** bump `ios.buildNumber`, run `npx expo prebuild -p ios`, open `ios/*.xcworkspace`, then Archive → Distribute → App Store Connect → TestFlight → submit.
  4. **Store review notes** (exact text): "This app controls a user's self-hosted Sonarr server on their own local network. To review without a server, tap 'Explore with sample data' on the first screen. Every screen works with sample data." Also give the ATS justification: "Users enter the address of their own self-hosted server, typically a local IP over plain HTTP; the address is not known in advance."
  5. **Privacy:** no data is collected (App Store privacy label "Data Not Collected", Play Data safety "No data collected").
  6. **Device verification checklist** (below).
- [ ] **Step 7:** Rewrite `README.md`: what it is, the screens, "talks directly to your Sonarr, with no servers in between," local network/VPN only, install (stores + APK from Releases), and development (`npm install`, `npx expo start`, Expo Go for UI, `npx expo run:ios --device` on a Mac for the full check).
- [ ] **Step 8: Device verification. The owner does this on their iPhone with a dev build** (`npx expo run:ios --device` on the Mac), and the friend repeats it on Android with an APK built locally. Check each item and note the results in the PR:
  - The Local Network prompt appears with the app's text, and connecting via `http://<LAN IP>:8989` works.
  - Connecting via the VPN (hostname or IP) works.
  - Kill and reopen the app: you stay connected, screens show cached data instantly, then refresh.
  - Turn Wi-Fi/VPN off with the app open: the stale banner appears, cached data stays, and nothing crashes.
  - Add a show, search an episode, pick and grab a release, remove a queue item with block, and check each against the Sonarr web UI.
  - Sample-data mode works with no network at all.
- [ ] **Step 9:** Run `npm test && npm run typecheck && npm run lint`. Expected: PASS.
- [ ] **Step 10:** Commit (`feat: release signing, CI, docs`), push the branch, and open the PR with `gh pr create` (the body links the spec and plan and lists the device-check results).
