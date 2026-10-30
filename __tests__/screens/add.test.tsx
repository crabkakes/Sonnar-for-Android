import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { LookupSeries, Series } from '../../src/api/types';
import AddScreen from '../../app/add';
import { hashBaseUrl } from '../../src/connection/storage';
import { renderWithProviders } from '../../test/render';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
}));

const look = (tvdbId: number, title: string, extra: Partial<LookupSeries> = {}): LookupSeries => ({
  tvdbId, title, year: 2021, network: 'AMC', status: 'continuing', monitored: false, seriesType: 'standard', images: [], seasons: [], ...extra,
});
// Sonarr's lookup returns `id: 0` for shows that aren't in the library yet.
const results = [look(1, 'New Show', { id: 0 }), look(2, 'Old Show', { id: 77 })];
const defaultsKey = `rfs.addDefaults.${hashBaseUrl('http://sonarr.test')}`;

const api = (extra = {}) => ({
  lookupSeries: jest.fn(async () => results),
  getRootFolders: jest.fn(async () => [{ id: 1, path: '/tv' }, { id: 2, path: '/anime' }]),
  getQualityProfiles: jest.fn(async () => [{ id: 4, name: 'HD' }, { id: 5, name: 'UHD' }]),
  addSeries: jest.fn(async () => ({ id: 900, title: 'New Show' }) as Series),
  ...extra,
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

async function search(extra = {}) {
  const r = await renderWithProviders(<AddScreen />, { api: api(extra) });
  await fireEvent.changeText(screen.getByPlaceholderText('Search for a show'), 'show');
  await act(async () => { jest.advanceTimersByTime(400); });
  await screen.findByText('New Show');
  return r;
}

describe('add show', () => {
  it('is wrapped in Screen with a back control', async () => {
    await renderWithProviders(<AddScreen />, { api: api() });
    expect(screen.getByTestId('screen')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalled();
  });

  it('search is debounced 400ms and calls lookupSeries', async () => {
    const r = await renderWithProviders(<AddScreen />, { api: api() });
    await fireEvent.changeText(screen.getByPlaceholderText('Search for a show'), 'sho');
    await act(async () => { jest.advanceTimersByTime(300); });
    await fireEvent.changeText(screen.getByPlaceholderText('Search for a show'), 'show');
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(r.api.lookupSeries).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(100); });
    await waitFor(() => expect(r.api.lookupSeries).toHaveBeenCalledTimes(1));
    expect(r.api.lookupSeries).toHaveBeenCalledWith('show');
    expect(await screen.findByText('New Show')).toBeTruthy();
  });

  it('already-added result shows "In library" and opens its detail instead', async () => {
    await search();
    expect(screen.getAllByText('In library')).toHaveLength(1);
    await fireEvent.press(screen.getByText('Old Show'));
    expect(mockPush).toHaveBeenCalledWith('/series/77');
  });

  it('choosing a result shows options prefilled from defaults', async () => {
    await AsyncStorage.setItem(
      defaultsKey,
      JSON.stringify({ rootFolderPath: '/anime', qualityProfileId: 5, monitor: 'future', seriesType: 'anime', searchForMissingEpisodes: false }),
    );
    await search();
    await fireEvent.press(screen.getByText('New Show'));
    expect(await screen.findByText('/anime')).toBeTruthy();
    expect(screen.getByText('UHD')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Future' }).props.accessibilityState?.selected).toBe(true);
    expect(screen.getByRole('button', { name: 'Anime' }).props.accessibilityState?.selected).toBe(true);
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();
  });

  it('"Add & search" calls addSeries with chosen options, saves defaults, navigates to /series/[newId]', async () => {
    const r = await search();
    await fireEvent.press(screen.getByText('New Show'));
    await screen.findByText('/tv');
    await fireEvent.press(screen.getByRole('button', { name: 'Folder' }));
    await fireEvent.press(screen.getByRole('button', { name: '/anime' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Missing' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Daily' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add & search' }));
    await waitFor(() => expect(r.api.addSeries).toHaveBeenCalled());
    expect(r.api.addSeries).toHaveBeenCalledWith({
      lookup: results[0], rootFolderPath: '/anime', qualityProfileId: 4, monitor: 'missing', seriesType: 'daily', searchForMissingEpisodes: true,
    });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/series/900'));
    expect(JSON.parse((await AsyncStorage.getItem(defaultsKey))!)).toEqual({
      rootFolderPath: '/anime', qualityProfileId: 4, monitor: 'missing', seriesType: 'daily', searchForMissingEpisodes: true,
    });
  });

  it('does not navigate when addSeries fails', async () => {
    await search({ addSeries: jest.fn(async () => { throw new Error('boom'); }) });
    await fireEvent.press(screen.getByText('New Show'));
    await screen.findByText('/tv');
    await fireEvent.press(screen.getByRole('button', { name: 'Add & search' }));
    await act(async () => { await Promise.resolve(); });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('with search off, button reads "Add"', async () => {
    await search();
    await fireEvent.press(screen.getByText('New Show'));
    await screen.findByText('/tv');
    await fireEvent(screen.getByRole('switch', { name: 'Search for missing episodes' }), 'valueChange', false);
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add & search' })).toBeNull();
  });

  it('no root folders shows "Add a root folder in Sonarr first" and disables add', async () => {
    await search({ getRootFolders: jest.fn(async () => []) });
    await fireEvent.press(screen.getByText('New Show'));
    expect(await screen.findByText('Add a root folder in Sonarr first')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add & search' }).props.accessibilityState?.disabled).toBe(true);
  });

  it('add stays disabled while there is no root folder path (folders still loading)', async () => {
    const r = await search({ getRootFolders: jest.fn(() => new Promise(() => {})) });
    await fireEvent.press(screen.getByText('New Show'));
    await screen.findByText('HD');
    const button = screen.getByRole('button', { name: 'Add & search' });
    expect(button.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(button);
    expect(r.api.addSeries).not.toHaveBeenCalled();
  });
});
