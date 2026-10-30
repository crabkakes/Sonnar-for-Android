import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { Episode, Series } from '../../src/api/types';
import SeriesDetailScreen from '../../app/series/[id]';
import { renderWithProviders } from '../../test/render';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({ id: '5' }),
}));

const series: Series = {
  id: 5, title: 'Harbor Lights', year: 2020, network: 'HBO', status: 'continuing', monitored: true, qualityProfileId: 2,
  seriesType: 'standard', images: [],
  seasons: [{ seasonNumber: 0, monitored: false }, { seasonNumber: 1, monitored: true }, { seasonNumber: 2, monitored: true }],
};
const ep = (id: number, seasonNumber: number, episodeNumber: number, extra: Partial<Episode> = {}): Episode => ({
  id, seriesId: 5, seasonNumber, episodeNumber, title: `Ep ${id}`, airDateUtc: '2020-01-01T00:00:00Z', hasFile: false, monitored: true, ...extra,
});
const episodes = [ep(10, 1, 1), ep(20, 2, 1), ep(21, 2, 2, { hasFile: true }), ep(30, 0, 1, { airDateUtc: undefined })];

const api = () => ({
  getSeriesById: jest.fn(async () => series),
  getEpisodes: jest.fn(async () => episodes),
  getQualityProfiles: jest.fn(async () => [{ id: 2, name: 'HD-1080p' }]),
  updateSeries: jest.fn(async (s: Series) => s),
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

async function open(extra = {}) {
  const r = await renderWithProviders(<SeriesDetailScreen />, { api: { ...api(), ...extra } });
  await screen.findByText('Harbor Lights');
  await screen.findByText('Ep 20');
  return r;
}

describe('series detail', () => {
  it('shows header info, wrapped in Screen, with a back control', async () => {
    await open();
    expect(screen.getByTestId('screen')).toBeTruthy();
    expect(await screen.findByText(/HD-1080p/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalled();
  });

  it('only newest season expanded by default', async () => {
    await open();
    expect(screen.getByText('Ep 20')).toBeTruthy();
    expect(screen.queryByText('Ep 10')).toBeNull();
    expect(screen.queryByText('Ep 30')).toBeNull();
    await fireEvent.press(screen.getByText('Season 1'));
    expect(screen.getByText('Ep 10')).toBeTruthy();
  });

  it('episode search calls searchEpisodes([id]) and shows "Search started"', async () => {
    const r = await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Actions for episode 2x01' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(r.api.searchEpisodes).toHaveBeenCalledWith([20]));
    expect(await screen.findByText('Search started')).toBeTruthy();
  });

  it('season search calls searchSeason', async () => {
    const r = await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Actions for Season 2' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(r.api.searchSeason).toHaveBeenCalledWith(5, 2));
  });

  it('"Pick a release" on episode navigates to /releases?episodeId=', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Actions for episode 2x01' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Pick a release' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/releases', params: { episodeId: 20 } });
  });

  it('"Pick a release" on season navigates to /releases?seriesId=&seasonNumber=', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Actions for Season 2' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Pick a release' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/releases', params: { seriesId: 5, seasonNumber: 2 } });
  });

  it('toggle season monitored PUTs series with that season flipped', async () => {
    const r = await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Actions for Season 2' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Unmonitor' }));
    await waitFor(() => expect(r.api.updateSeries).toHaveBeenCalled());
    const sent = r.api.updateSeries.mock.calls[0][0];
    expect(sent.monitored).toBe(true);
    expect(sent.seasons.map((s) => [s.seasonNumber, s.monitored])).toEqual([[0, false], [1, true], [2, false]]);
  });

  it('toggle episode monitored calls setEpisodesMonitored', async () => {
    const r = await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Actions for episode 2x01' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Unmonitor' }));
    await waitFor(() => expect(r.api.setEpisodesMonitored).toHaveBeenCalledWith([20], false));
  });

  it('delete asks confirmation with an "also delete files" option, then deleteSeries(id, true) and navigates back', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete show' }));
    expect(alert).toHaveBeenCalledTimes(1);
    const buttons = alert.mock.calls[0][2]!;
    expect(buttons.map((b) => b.text)).toEqual(['Cancel', 'Delete show', 'Delete show and files']);
    expect(r.api.deleteSeries).not.toHaveBeenCalled();
    await buttons[2].onPress!();
    await waitFor(() => expect(r.api.deleteSeries).toHaveBeenCalledWith(5, true));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('renders sparse data (no title, TBA episode) without crashing', async () => {
    await renderWithProviders(<SeriesDetailScreen />, {
      api: { ...api(), getEpisodes: jest.fn(async () => [ep(30, 0, 1, { airDateUtc: undefined, title: undefined })]) },
    });
    await fireEvent.press(await screen.findByText('Specials'));
    expect(await screen.findAllByText('TBA')).toHaveLength(2);
  });
});
