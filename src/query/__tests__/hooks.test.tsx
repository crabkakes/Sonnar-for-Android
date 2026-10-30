import { Pressable, Text } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SonarrError } from '../../api/errors';
import type { Series } from '../../api/types';
import { StaleBanner } from '../../ui/Banners';
import { renderWithProviders } from '../../../test/render';
import { useSonarrMutation, useSonarrQuery } from '../hooks';

function SeriesProbe() {
  const q = useSonarrQuery(['series'], (api) => api.getSeries());
  return (
    <>
      <StaleBanner />
      <Text>{`count:${q.data?.length ?? 'none'} stale:${q.isStale}`}</Text>
      <Pressable accessibilityRole="button" onPress={() => q.refetch()}>
        <Text>refetch</Text>
      </Pressable>
    </>
  );
}

test('isStale true after a failed refetch with cached data', async () => {
  const getSeries = jest
    .fn()
    .mockResolvedValueOnce([{ id: 1 } as Series])
    .mockRejectedValueOnce(new SonarrError('unreachable'));
  await renderWithProviders(<SeriesProbe />, { api: { getSeries } });

  await screen.findByText('count:1 stale:false');
  expect(screen.queryByText("Can't reach Sonarr — showing saved data")).toBeNull();

  await fireEvent.press(screen.getByText('refetch'));
  await screen.findByText('count:1 stale:true');
  expect(screen.getByText("Can't reach Sonarr — showing saved data")).toBeTruthy();
});

function MutationProbe() {
  const m = useSonarrMutation((api, id: number) => api.searchEpisodes([id]), {
    successMessage: 'Search started',
    invalidate: [['queue']],
  });
  return (
    <Pressable accessibilityRole="button" onPress={() => m.run(1)}>
      <Text>go</Text>
    </Pressable>
  );
}

test('sample mutation shows sample notice', async () => {
  await renderWithProviders(<MutationProbe />, { mode: 'sample' });
  await act(async () => {
    await fireEvent.press(screen.getByText('go'));
  });
  expect(await screen.findByText('Sample data — nothing was changed.')).toBeTruthy();
  expect(screen.queryByText('Search started')).toBeNull();
});

test('live mutation shows success message; failure shows the error title', async () => {
  const searchEpisodes = jest.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new SonarrError('unreachable'));
  await renderWithProviders(<MutationProbe />, { api: { searchEpisodes } });
  await act(async () => {
    await fireEvent.press(screen.getByText('go'));
  });
  expect(await screen.findByText('Search started')).toBeTruthy();
  await act(async () => {
    await fireEvent.press(screen.getByText('go'));
  });
  await waitFor(() => expect(screen.getByText("Can't reach Sonarr")).toBeTruthy());
});
