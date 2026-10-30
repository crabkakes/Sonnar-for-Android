import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import type { HistoryItem, QueueItem } from '../../src/api/types';
import ActivityScreen from '../../app/(tabs)/activity';
import { renderWithProviders } from '../../test/render';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }), useIsFocused: () => true }));

const ep = { id: 9, seriesId: 3, seasonNumber: 1, episodeNumber: 2, hasFile: false, monitored: true };
const q = (id: number, extra: Partial<QueueItem> = {}): QueueItem =>
  ({
    id, title: `release-${id}`, status: 'downloading', series: { id: 3, title: `Show ${id}` }, episode: ep,
    size: 1000, sizeleft: 250, timeleft: '00:04:12', ...extra,
  }) as QueueItem;
const queuePage = (records: QueueItem[]) => ({ page: 1, pageSize: 100, totalRecords: records.length, records });
const h = (id: number, extra: Partial<HistoryItem> = {}): HistoryItem =>
  ({
    id, eventType: 'grabbed', date: '2026-10-30T11:55:00Z', sourceTitle: `src-${id}`, seriesId: 3, episodeId: 9,
    series: { id: 3, title: 'Show H' }, episode: ep, quality: { quality: { name: 'HDTV-720p' } }, ...extra,
  }) as HistoryItem;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  jest.setSystemTime(new Date('2026-10-30T12:00:00Z'));
});
afterEach(() => jest.useRealTimers());

describe('activity: queue', () => {
  it('queue polls every 5s while focused', async () => {
    const getQueue = jest.fn(async () => queuePage([q(1)]));
    await renderWithProviders(<ActivityScreen />, { api: { getQueue } });
    await screen.findByText('Show 1');
    expect(getQueue).toHaveBeenCalledTimes(1);
    await act(async () => { await jest.advanceTimersByTimeAsync(10_000); });
    expect(getQueue.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('shows count in the segmented control and row details', async () => {
    await renderWithProviders(<ActivityScreen />, { api: { getQueue: jest.fn(async () => queuePage([q(1), q(2)])) } });
    await screen.findByText('Show 1');
    expect(screen.getByText('Queue (2)')).toBeTruthy();
    expect(screen.getAllByText('S01E02 · 1000 B').length).toBe(2);
    expect(screen.getAllByText('4 min').length).toBe(2);
  });

  it('empty queue shows "Nothing downloading"', async () => {
    await renderWithProviders(<ActivityScreen />);
    expect(await screen.findByText('Nothing downloading')).toBeTruthy();
  });

  it('warning items show messages inline', async () => {
    const item = q(1, { trackedDownloadStatus: 'warning', statusMessages: [{ title: 't', messages: ['Stalled, no seeders'] }] });
    await renderWithProviders(<ActivityScreen />, { api: { getQueue: jest.fn(async () => queuePage([item])) } });
    expect(await screen.findByText('Stalled, no seeders')).toBeTruthy();
  });

  it('Remove asks to confirm with the switch (default on) then removes', async () => {
    const getQueue = jest.fn(async () => queuePage([q(7)]));
    const { api } = await renderWithProviders(<ActivityScreen />, { api: { getQueue } });
    await fireEvent.press(await screen.findByTestId('remove-7'));
    expect(screen.getByText('Also remove from download client')).toBeTruthy();
    expect(screen.getByTestId('remove-from-client-switch').props.value).toBe(true);
    expect(api.removeQueueItem).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('confirm-remove'));
    await waitFor(() => expect(api.removeQueueItem).toHaveBeenCalledWith(7, { blocklist: false, removeFromClient: true }));
    await waitFor(() => expect(getQueue.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('switch off sends removeFromClient:false; Cancel sends nothing', async () => {
    const { api } = await renderWithProviders(<ActivityScreen />, { api: { getQueue: jest.fn(async () => queuePage([q(7)])) } });
    await fireEvent.press(await screen.findByTestId('remove-7'));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.removeQueueItem).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('remove-7'));
    await fireEvent(screen.getByTestId('remove-from-client-switch'), 'valueChange', false);
    await fireEvent.press(screen.getByTestId('confirm-remove'));
    await waitFor(() => expect(api.removeQueueItem).toHaveBeenCalledWith(7, { blocklist: false, removeFromClient: false }));
  });

  it('"Remove + block" sends blocklist:true', async () => {
    const { api } = await renderWithProviders(<ActivityScreen />, { api: { getQueue: jest.fn(async () => queuePage([q(7)])) } });
    await fireEvent.press(await screen.findByTestId('block-7'));
    await fireEvent.press(screen.getByTestId('confirm-remove'));
    await waitFor(() => expect(api.removeQueueItem).toHaveBeenCalledWith(7, { blocklist: true, removeFromClient: true }));
  });

  it('sparse queue and history items render without crashing', async () => {
    const sparseQ = { id: 5, title: 'Bare.Release', status: 'queued' } as QueueItem;
    const sparseH = { id: 6, eventType: 'weirdEvent', date: '2026-10-30T11:00:00Z', sourceTitle: 'Bare.Source', seriesId: 1, episodeId: 1 } as HistoryItem;
    await renderWithProviders(<ActivityScreen />, {
      api: {
        getQueue: jest.fn(async () => queuePage([sparseQ])),
        getHistory: jest.fn(async () => ({ page: 1, pageSize: 50, totalRecords: 1, records: [sparseH] })),
      },
    });
    expect(await screen.findByText('Bare.Release')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /History/ }));
    expect(await screen.findByText('Bare.Source')).toBeTruthy();
    expect(screen.getByText('Weird Event')).toBeTruthy();
  });
});

describe('activity: history', () => {
  it('loads page 1 of 50, then page 2 on end reached, stopping at totalRecords', async () => {
    const getHistory = jest.fn(async (page: number) => ({
      page, pageSize: 50, totalRecords: 51,
      records: page === 1 ? Array.from({ length: 50 }, (_, i) => h(i + 1)) : [h(51)],
    }));
    await renderWithProviders(<ActivityScreen />, { api: { getHistory } });
    await fireEvent.press(screen.getByRole('button', { name: /History/ }));
    await waitFor(() => expect(getHistory).toHaveBeenCalledWith(1, 50));
    expect(getHistory).toHaveBeenCalledTimes(1);
    const list = await screen.findByTestId('history-list');
    await fireEvent(list, 'endReached');
    await waitFor(() => expect(getHistory).toHaveBeenCalledWith(2, 50));
    await fireEvent(list, 'endReached');
    await act(async () => { await jest.advanceTimersByTimeAsync(100); });
    expect(getHistory).toHaveBeenCalledTimes(2);
  });

  it('history row shows label, series, SxxEyy, quality, relative date', async () => {
    const getHistory = jest.fn(async () => ({ page: 1, pageSize: 50, totalRecords: 1, records: [h(1)] }));
    await renderWithProviders(<ActivityScreen />, { api: { getHistory } });
    await fireEvent.press(screen.getByRole('button', { name: /History/ }));
    const row = await screen.findByTestId('history-row-1');
    for (const t of ['Grabbed', 'Show H', 'S01E02', 'HDTV-720p', '5 min ago']) {
      expect(within(row).getByText(new RegExp(t))).toBeTruthy();
    }
  });
});
