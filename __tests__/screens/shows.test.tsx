import { fireEvent, screen } from '@testing-library/react-native';
import type { Series } from '../../src/api/types';
import ShowsScreen from '../../app/(tabs)/index';
import { renderWithProviders } from '../../test/render';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const mk = (id: number, title: string, extra: Partial<Series> = {}): Series =>
  ({ id, title, sortTitle: title.toLowerCase(), status: 'continuing', monitored: true, qualityProfileId: 1, seriesType: 'standard', images: [], seasons: [], ...extra }) as Series;

// Fake timers keep VirtualizedList's batch-render timers from firing outside act.
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe('shows screen', () => {
  it('renders inside the safe-area Screen wrapper', async () => {
    await renderWithProviders(<ShowsScreen />);
    expect(screen.getByTestId('screen')).toBeTruthy();
  });

  it('lists series sorted by sortTitle', async () => {
    await renderWithProviders(<ShowsScreen />, {
      api: { getSeries: jest.fn(async () => [mk(1, 'Zed'), mk(2, 'Alpha'), mk(3, 'Mid')]) },
    });
    await screen.findByText('Alpha');
    const titles = screen.getAllByTestId(/^series-row-/).map((n) => n.props.testID);
    expect(titles).toEqual(['series-row-2', 'series-row-3', 'series-row-1']);
  });

  it('filters by search text', async () => {
    await renderWithProviders(<ShowsScreen />, {
      api: { getSeries: jest.fn(async () => [mk(1, 'Harbor Lights'), mk(2, 'Other')]) },
    });
    await screen.findByText('Other');
    await fireEvent.changeText(screen.getByLabelText('Search shows'), 'harbor');
    expect(screen.getByText('Harbor Lights')).toBeTruthy();
    expect(screen.queryByText('Other')).toBeNull();
  });

  it('tapping a row opens /series/[id]', async () => {
    await renderWithProviders(<ShowsScreen />, { api: { getSeries: jest.fn(async () => [mk(7, 'Seven')]) } });
    await fireEvent.press(await screen.findByText('Seven'));
    expect(mockPush).toHaveBeenCalledWith('/series/7');
  });

  it('+ opens /add', async () => {
    await renderWithProviders(<ShowsScreen />, { api: { getSeries: jest.fn(async () => [mk(1, 'A')]) } });
    await fireEvent.press(screen.getByRole('button', { name: 'Add show' }));
    expect(mockPush).toHaveBeenCalledWith('/add');
  });

  it('gear opens /server', async () => {
    await renderWithProviders(<ShowsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Server settings' }));
    expect(mockPush).toHaveBeenCalledWith('/server');
  });

  it('renders 1000 series without rendering all rows', async () => {
    const many = Array.from({ length: 1000 }, (_, i) => mk(i + 1, `Show ${String(i).padStart(4, '0')}`));
    await renderWithProviders(<ShowsScreen />, { api: { getSeries: jest.fn(async () => many) } });
    await screen.findByText('Show 0000');
    const n = screen.getAllByTestId(/^series-row-/).length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(100);
  });

  it('empty library shows "No shows yet" with an Add button', async () => {
    await renderWithProviders(<ShowsScreen />);
    expect(await screen.findByText('No shows yet')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a show' }));
    expect(mockPush).toHaveBeenCalledWith('/add');
  });
});
