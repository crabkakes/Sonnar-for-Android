import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SonarrError } from '../../src/api/errors';
import type { Episode, Release, Series } from '../../src/api/types';
import ReleasesScreen from '../../app/releases';
import { renderWithProviders } from '../../test/render';

const mockBack = jest.fn();
let mockParams: Record<string, string> = { episodeId: '20', seriesId: '5' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const series = { id: 5, title: 'Harbor Lights', images: [], seasons: [] } as unknown as Series;
const episodes = [{ id: 20, seriesId: 5, seasonNumber: 2, episodeNumber: 8, hasFile: false, monitored: true }] as Episode[];

const rel = (n: number, extra: Partial<Release> = {}): Release => ({
  guid: `g${n}`, indexerId: n, indexer: `Indexer${n}`, title: `Harbor.Lights.S02E08.release.${n}`, size: 2 * 1024 ** 3,
  ageHours: 50, quality: { quality: { name: 'WEBDL-1080p', resolution: 1080 } }, protocol: 'torrent', seeders: 12,
  releaseGroup: `GRP${n}`, languages: [{ name: 'English' }], rejected: false, rejections: [], ...extra,
});

const base = (releases: Release[]) => ({
  getSeriesById: jest.fn(async () => series),
  getEpisodes: jest.fn(async () => episodes),
  getReleases: jest.fn(async () => releases),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { episodeId: '20', seriesId: '5' };
});

describe('releases screen', () => {
  it('shows progress text "Searching indexers…" and Cancel aborts the signal and goes back', async () => {
    let signal: AbortSignal | undefined;
    const getReleases = jest.fn(
      (_q: unknown, s?: AbortSignal) =>
        new Promise<Release[]>((_res, rej) => {
          signal = s;
          s?.addEventListener('abort', () => rej(new SonarrError('unreachable')));
        }),
    );
    await renderWithProviders(<ReleasesScreen />, { api: { ...base([]), getReleases } });
    expect(await screen.findByText('Searching indexers…')).toBeTruthy();
    expect(getReleases).toHaveBeenCalledWith({ episodeId: 20 }, expect.any(Object));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(signal?.aborted).toBe(true);
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Can't reach Sonarr")).toBeNull();
  });

  it('aborts the search when the screen unmounts, without showing an error', async () => {
    let signal: AbortSignal | undefined;
    const getReleases = jest.fn(
      (_q: unknown, s?: AbortSignal) =>
        new Promise<Release[]>((_res, rej) => {
          signal = s;
          s?.addEventListener('abort', () => rej(new SonarrError('unreachable')));
        }),
    );
    const r = await renderWithProviders(<ReleasesScreen />, { api: { ...base([]), getReleases } });
    await screen.findByText('Searching indexers…');
    await r.unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('rows show quality, size, seeders (torrent only), group; rejected rows dimmed with ⚠', async () => {
    const rs = [rel(1), rel(2, { protocol: 'usenet', seeders: undefined }), rel(3, { rejected: true, rejections: ['Nope'] })];
    await renderWithProviders(<ReleasesScreen />, { api: base(rs) });
    const row1 = await screen.findByTestId('release-row-g1');
    expect(row1).toHaveTextContent(/WEBDL\-1080p/);
    expect(row1).toHaveTextContent(/2\.0\ GB/);
    expect(row1).toHaveTextContent(/12\ seeders/);
    expect(row1).toHaveTextContent(/GRP1/);
    expect(screen.getByTestId('release-row-g2')).not.toHaveTextContent(/seeders/);
    expect(screen.getByTestId('release-row-g3')).toHaveTextContent(/⚠/);
    expect(screen.getByTestId('release-row-g3')).toHaveStyle({ opacity: 0.55 });
    expect(screen.getByTestId('release-row-g1')).not.toHaveTextContent(/⚠/);
  });

  it('renders sparse releases (no seeders, group, languages or age)', async () => {
    const sparse = rel(1, { seeders: undefined, releaseGroup: undefined, languages: undefined, ageHours: undefined, indexer: undefined });
    await renderWithProviders(<ReleasesScreen />, { api: base([sparse]) });
    await fireEvent.press(await screen.findByTestId('release-row-g1'));
    expect(screen.getByText('Harbor.Lights.S02E08.release.1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Grab' })).toBeTruthy();
  });

  it('tapping a row expands full title, indexer, age, languages, rejection reasons, and Grab; one at a time', async () => {
    const rs = [rel(1, { rejected: true, rejections: ['Not an upgrade', 'Too small'] }), rel(2)];
    await renderWithProviders(<ReleasesScreen />, { api: base(rs) });
    expect(screen.queryByRole('button', { name: 'Grab' })).toBeNull();
    await fireEvent.press(await screen.findByTestId('release-row-g1'));
    const row = screen.getByTestId('release-row-g1');
    expect(row).toHaveTextContent(/Harbor\.Lights\.S02E08\.release\.1/);
    expect(row).toHaveTextContent(/Indexer1/);
    expect(row).toHaveTextContent(/2\ d/);
    expect(row).toHaveTextContent(/English/);
    expect(row).toHaveTextContent(/Not\ an\ upgrade/);
    expect(row).toHaveTextContent(/Too\ small/);
    expect(screen.getAllByRole('button', { name: 'Grab' })).toHaveLength(1);
    await fireEvent.press(screen.getByTestId('release-row-g2'));
    expect(screen.getByTestId('release-row-g1')).not.toHaveTextContent(/Indexer1/);
    expect(screen.getByTestId('release-row-g2')).toHaveTextContent(/Indexer2/);
  });

  it('Grab calls grabRelease({guid,indexerId}) and shows "Sent to download client"', async () => {
    const a = base([rel(1)]);
    const grabRelease = jest.fn(async () => {});
    const { api } = await renderWithProviders(<ReleasesScreen />, { api: { ...a, grabRelease } });
    await fireEvent.press(await screen.findByTestId('release-row-g1'));
    await fireEvent.press(screen.getByRole('button', { name: 'Grab' }));
    await waitFor(() => expect(api.grabRelease).toHaveBeenCalledWith({ guid: 'g1', indexerId: 1 }));
    expect(await screen.findByText('Sent to download client')).toBeTruthy();
  });

  it('grabbing a rejected release asks to confirm first', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { api } = await renderWithProviders(<ReleasesScreen />, { api: base([rel(1, { rejected: true, rejections: ['Nope'] })]) });
    await fireEvent.press(await screen.findByTestId('release-row-g1'));
    await fireEvent.press(screen.getByRole('button', { name: 'Grab' }));
    expect(api.grabRelease).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledTimes(1);
    const buttons = alert.mock.calls[0][2]!;
    await buttons.find((b) => b.style !== 'cancel')!.onPress!();
    await waitFor(() => expect(api.grabRelease).toHaveBeenCalledWith({ guid: 'g1', indexerId: 1 }));
    alert.mockRestore();
  });

  it('header shows the count after filtering, with singular for one', async () => {
    const rs = [rel(1), rel(2, { quality: { quality: { name: 'HDTV-720p', resolution: 720 } } }), rel(3, { rejected: true, rejections: ['x'] })];
    await renderWithProviders(<ReleasesScreen />, { api: base(rs) });
    expect(await screen.findByText('3 releases')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '720p' }));
    expect(screen.getByText('1 release')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'All' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Hide rejected' }));
    expect(screen.getByText('2 releases')).toBeTruthy();
  });

  it('sort menu reorders rows', async () => {
    const rs = [rel(1, { size: 100 }), rel(2, { size: 900 })];
    await renderWithProviders(<ReleasesScreen />, { api: base(rs) });
    await screen.findByTestId('release-row-g1');
    await fireEvent.press(screen.getByRole('button', { name: 'Sort' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Size' }));
    const rows = screen.getAllByTestId(/^release-row-/);
    expect(rows[0].props.testID).toBe('release-row-g2');
  });

  it('title shows series name and S02E08 for an episode, Season 2 for a season search', async () => {
    const a = base([rel(1)]);
    await renderWithProviders(<ReleasesScreen />, { api: a });
    expect(await screen.findByText('Harbor Lights · S02E08')).toBeTruthy();
  });

  it('season search uses seriesId + seasonNumber and a Season title', async () => {
    mockParams = { seriesId: '5', seasonNumber: '2' };
    const a = base([rel(1)]);
    await renderWithProviders(<ReleasesScreen />, { api: a });
    expect(await screen.findByText('Harbor Lights · Season 2')).toBeTruthy();
    expect(a.getReleases).toHaveBeenCalledWith({ seriesId: 5, seasonNumber: 2 }, expect.any(Object));
  });

  it('no results shows "No releases found"', async () => {
    await renderWithProviders(<ReleasesScreen />, { api: base([]) });
    expect(await screen.findByText('No releases found')).toBeTruthy();
  });

  it('error shows userMessage title with Retry, which searches again', async () => {
    const getReleases = jest.fn().mockRejectedValueOnce(new SonarrError('timeout')).mockResolvedValue([rel(1)]);
    await renderWithProviders(<ReleasesScreen />, { api: { ...base([]), getReleases } });
    expect(await screen.findByText('Sonarr took too long to answer')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByTestId('release-row-g1')).toBeTruthy();
    expect(getReleases).toHaveBeenCalledTimes(2);
  });
});
