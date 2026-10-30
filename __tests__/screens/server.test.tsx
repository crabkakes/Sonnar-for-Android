import { Alert } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createLiveApi } from '../../src/api/liveApi';
import { SonarrError } from '../../src/api/errors';
import ServerScreen from '../../app/server';
import { renderWithProviders } from '../../test/render';

jest.mock('../../src/api/liveApi');

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack, canGoBack: mockCanGoBack }),
}));

const testConnection = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  (createLiveApi as jest.Mock).mockReturnValue({ testConnection });
  testConnection.mockResolvedValue({ appName: 'Sonarr', version: '4.0.9' });
});

async function fill(url: string, key: string) {
  await fireEvent.changeText(screen.getByLabelText('Server address'), url);
  await fireEvent.changeText(screen.getByLabelText('API key'), key);
}

describe('server screen', () => {
  it('test then save connects', async () => {
    const { connection } = await renderWithProviders(<ServerScreen />, { mode: 'none' });
    await fill('192.168.1.50:8989', 'abc');
    await fireEvent.press(screen.getByText('Test'));
    expect(await screen.findByText('Connected to Sonarr 4.0.9')).toBeTruthy();
    expect(createLiveApi).toHaveBeenCalledWith({ baseUrl: 'http://192.168.1.50:8989', apiKey: 'abc' });
    await fireEvent.press(screen.getByText('Save'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(connection.setLive).toHaveBeenCalledWith({ baseUrl: 'http://192.168.1.50:8989', apiKey: 'abc' });
  });

  it('save is disabled until a test succeeds for the current values', async () => {
    await renderWithProviders(<ServerScreen />, { mode: 'none' });
    await fill('192.168.1.50:8989', 'abc');
    const save = () => screen.getByRole('button', { name: 'Save' });
    expect(save()).toBeDisabled();
    await fireEvent.press(screen.getByText('Test'));
    await screen.findByText('Connected to Sonarr 4.0.9');
    expect(save()).toBeEnabled();
    await fireEvent.changeText(screen.getByLabelText('Server address'), '192.168.1.51:8989');
    expect(save()).toBeDisabled();
  });

  it('shows error copy', async () => {
    testConnection.mockRejectedValue(new SonarrError('unauthorized'));
    await renderWithProviders(<ServerScreen />, { mode: 'none' });
    await fill('192.168.1.50:8989', 'bad');
    await fireEvent.press(screen.getByText('Test'));
    expect(await screen.findByText('API key was rejected')).toBeTruthy();
    expect(screen.getByText('Copy it from Sonarr → Settings → General → Security.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows invalid address copy without testing', async () => {
    await renderWithProviders(<ServerScreen />, { mode: 'none' });
    await fill('ht!tp://', 'abc');
    await fireEvent.press(screen.getByText('Test'));
    expect(await screen.findByText("That address doesn't look right")).toBeTruthy();
    expect(createLiveApi).not.toHaveBeenCalled();
  });

  it('explore with sample data', async () => {
    const { connection } = await renderWithProviders(<ServerScreen />, { mode: 'none' });
    await fireEvent.press(screen.getByText('Explore with sample data'));
    await waitFor(() => expect(connection.setSample).toHaveBeenCalled());
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('editing existing connection prefills URL, masks key, offers Disconnect', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { connection } = await renderWithProviders(<ServerScreen />, { mode: 'live' });
    expect(screen.getByLabelText('Server address').props.value).toBe('http://sonarr.test');
    expect(screen.getByLabelText('API key').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByText('Disconnect'));
    expect(alert).toHaveBeenCalled();
    expect(connection.disconnect).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => {
      await buttons.find((b) => b.style === 'destructive')!.onPress!();
    });
    expect(connection.disconnect).toHaveBeenCalled();
  });

  it('first run has no Close control', async () => {
    await renderWithProviders(<ServerScreen />, { mode: 'none' });
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('opened while connected shows Close, which goes back', async () => {
    await renderWithProviders(<ServerScreen />, { mode: 'live' });
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('Close falls back to / when there is nothing to go back to', async () => {
    mockCanGoBack.mockReturnValueOnce(false);
    await renderWithProviders(<ServerScreen />, { mode: 'sample' });
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('saving while already connected goes back instead of pushing another (tabs)', async () => {
    const { connection } = await renderWithProviders(<ServerScreen />, { mode: 'live' });
    await fill('192.168.1.60:8989', 'new');
    await fireEvent.press(screen.getByText('Test'));
    await screen.findByText('Connected to Sonarr 4.0.9');
    await fireEvent.press(screen.getByText('Save'));
    await waitFor(() => expect(connection.setLive).toHaveBeenCalled());
    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('a failed disconnect shows a message instead of an unhandled rejection', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { connection } = await renderWithProviders(<ServerScreen />, { mode: 'live' });
    (connection.disconnect as jest.Mock).mockRejectedValueOnce(new Error('keychain locked'));
    await fireEvent.press(screen.getByText('Disconnect'));
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => {
      await buttons.find((b) => b.style === 'destructive')!.onPress!();
    });
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByLabelText('Server address').props.value).toBe('http://sonarr.test');
  });
});
