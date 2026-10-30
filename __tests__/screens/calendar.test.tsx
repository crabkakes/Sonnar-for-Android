import { fireEvent, screen } from '@testing-library/react-native';
import type { Episode } from '../../src/api/types';
import CalendarScreen from '../../app/(tabs)/calendar';
import { renderWithProviders } from '../../test/render';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('expo-localization', () => ({
  getCalendars: () => [{ firstWeekday: 1, timeZone: 'America/New_York' }],
}));

const mk = (id: number, airDateUtc: string | undefined, extra: Partial<Episode> = {}): Episode =>
  ({
    id, seriesId: 10 + id, seasonNumber: 2, episodeNumber: 9, title: `Ep ${id}`, airDateUtc,
    hasFile: false, monitored: true, series: { id: 10 + id, title: `Show ${id}` }, ...extra,
  }) as Episode;

// Thu Oct 30 2026, 10:00 New York (EDT)
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-30T14:00:00Z'));
});
afterEach(() => jest.useRealTimers());

const today = [mk(1, '2026-10-31T01:00:00Z'), mk(2, '2026-10-30T23:00:00Z', { hasFile: true })];
const getCalendar = () => jest.fn(async () => today);

describe('calendar screen', () => {
  it('opens on today with today selected', async () => {
    const { api } = await renderWithProviders(<CalendarScreen />, { api: { getCalendar: getCalendar() } });
    expect(screen.getByTestId('day-2026-10-30').props.accessibilityState).toMatchObject({ selected: true });
    expect(api.getCalendar).toHaveBeenCalledWith('2026-10-25T04:00:00.000Z', '2026-11-01T04:00:00.000Z');
  });

  it('days with episodes show a dot', async () => {
    await renderWithProviders(<CalendarScreen />, { api: { getCalendar: getCalendar() } });
    await screen.findByTestId('dot-2026-10-30');
    expect(screen.queryByTestId('dot-2026-10-29')).toBeNull();
  });

  it('tap a day lists its episodes with local time and status', async () => {
    await renderWithProviders(<CalendarScreen />, { api: { getCalendar: getCalendar() } });
    await screen.findByTestId('episode-row-1');
    expect(screen.getByText('Show 1')).toBeTruthy();
    expect(screen.getByText('S02E09 · Ep 1')).toBeTruthy();
    expect(screen.getByText('9:00 PM')).toBeTruthy();
    expect(screen.getByText('Unaired')).toBeTruthy();
    expect(screen.getByText('Downloaded')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('day-2026-10-28'));
    expect(screen.getByText('Nothing airing')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('day-2026-10-30'));
    expect(screen.getByTestId('episode-row-1')).toBeTruthy();
  });

  it('next arrow loads next week via getCalendar(startUtc,endUtc)', async () => {
    const { api } = await renderWithProviders(<CalendarScreen />, { api: { getCalendar: getCalendar() } });
    await fireEvent.press(screen.getByRole('button', { name: 'Next week' }));
    expect(api.getCalendar).toHaveBeenLastCalledWith('2026-11-01T04:00:00.000Z', '2026-11-08T05:00:00.000Z');
    expect(screen.getByTestId('day-2026-11-01')).toBeTruthy();
  });

  it('"Today" button returns to current week', async () => {
    await renderWithProviders(<CalendarScreen />, { api: { getCalendar: getCalendar() } });
    await fireEvent.press(screen.getByRole('button', { name: 'Next week' }));
    expect(screen.queryByTestId('day-2026-10-30')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByTestId('day-2026-10-30').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('tapping an episode opens /series/[seriesId]', async () => {
    await renderWithProviders(<CalendarScreen />, { api: { getCalendar: getCalendar() } });
    await fireEvent.press(await screen.findByTestId('episode-row-1'));
    expect(mockPush).toHaveBeenCalledWith('/series/11');
  });

  it('empty day shows "Nothing airing"', async () => {
    await renderWithProviders(<CalendarScreen />);
    expect(await screen.findByText('Nothing airing')).toBeTruthy();
  });
});
