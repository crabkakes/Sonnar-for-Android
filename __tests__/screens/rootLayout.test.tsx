import { useEffect } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { router, Slot } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import RootLayout from '../../app/_layout';
import ServerScreen from '../../app/server';
import { useConnection } from '../../src/connection/ConnectionProvider';

let disconnect: () => Promise<void>;
function Home() {
  const c = useConnection();
  useEffect(() => {
    disconnect = c.disconnect;
  });
  return (
    <Pressable accessibilityRole="button">
      <Text>Home</Text>
    </Pressable>
  );
}
const Stub = () => null;

const app = {
  _layout: RootLayout,
  server: ServerScreen,
  '(tabs)/_layout': Slot,
  '(tabs)/index': Home,
  '(tabs)/calendar': Stub,
  '(tabs)/activity': Stub,
  'series/[id]': Stub,
  add: Stub,
  releases: Stub,
};

// renderRouter switches to fake timers; let the async storage reads and the router settle.
const settle = () => act(() => jest.advanceTimersByTimeAsync(100));

beforeEach(async () => {
  await AsyncStorage.clear();
  await SecureStore.deleteItemAsync('rfs.baseUrl');
  await SecureStore.deleteItemAsync('rfs.apiKey');
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, text: async () => '[]' })) as unknown as typeof fetch;
});
afterEach(() => jest.useRealTimers());

async function goLive() {
  await SecureStore.setItemAsync('rfs.baseUrl', 'http://sonarr.test');
  await SecureStore.setItemAsync('rfs.apiKey', 'k');
  await AsyncStorage.setItem('rfs.mode', 'live');
}

test('first run shows the Server screen', async () => {
  await renderRouter(app, { initialUrl: '/' });
  await settle();
  expect(screen.getByText('Connect to Sonarr')).toBeTruthy();
  expect(screen).toHavePathname('/server');
});

test('a saved connection lands on the tabs', async () => {
  await goLive();
  await renderRouter(app, { initialUrl: '/' });
  await settle();
  expect(screen.getByText('Home')).toBeTruthy();
});

test('Disconnect returns to the Server screen', async () => {
  await goLive();
  await renderRouter(app, { initialUrl: '/' });
  await settle();
  expect(screen.getByText('Home')).toBeTruthy();
  await act(() => disconnect());
  await settle();
  expect(screen.getByText('Connect to Sonarr')).toBeTruthy();
  expect(screen.queryByText('Home')).toBeNull();
});

test('Disconnect from the Server screen stays on a usable Server screen', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await goLive();
  await renderRouter(app, { initialUrl: '/server' });
  await settle();
  await fireEvent.press(screen.getByText('Disconnect'));
  const buttons = alert.mock.calls[0][2]!;
  await act(async () => {
    await buttons.find((b) => b.style === 'destructive')!.onPress!();
  });
  await settle();
  expect(screen.getByText('Connect to Sonarr')).toBeTruthy();
  expect(screen.getByText('Explore with sample data')).toBeTruthy();
});

function mockSonarr() {
  global.fetch = jest.fn(async (url: string) => ({
    ok: true,
    status: 200,
    text: async () => (String(url).endsWith('/system/status') ? JSON.stringify({ appName: 'Sonarr', version: '4.0.9' }) : '[]'),
  })) as unknown as typeof fetch;
}

async function testAndSave(url: string) {
  await fireEvent.changeText(screen.getByLabelText('Server address'), url);
  await fireEvent.changeText(screen.getByLabelText('API key'), 'k');
  await fireEvent.press(screen.getByText('Test'));
  await settle();
  expect(screen.getByText('Connected to Sonarr 4.0.9')).toBeTruthy();
  await fireEvent.press(screen.getByText('Save'));
  await settle();
}

/** Names of the routes on the app's root Stack (under expo-router's internal `__root`). */
const stackRoutes = (state: any): string[] => state.routes[0].state.routes.map((r: any) => r.name);

test('first-run Save lands on the tabs', async () => {
  mockSonarr();
  const r = await renderRouter(app, { initialUrl: '/' });
  await settle();
  await testAndSave('192.168.1.50:8989');
  expect(screen.getByText('Home')).toBeTruthy();
  expect(r.getPathname()).toBe('/');
});

test('first-run Explore lands on the tabs', async () => {
  const r = await renderRouter(app, { initialUrl: '/' });
  await settle();
  await fireEvent.press(screen.getByText('Explore with sample data'));
  await settle();
  expect(screen.getByText('Home')).toBeTruthy();
  expect(r.getPathname()).toBe('/');
});

test('Save while connected goes back to the existing tabs', async () => {
  mockSonarr();
  await goLive();
  const r = await renderRouter(app, { initialUrl: '/' });
  await settle();
  await act(() => router.push('/server' as never));
  await settle();
  expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  await testAndSave('192.168.1.60:8989');
  expect(r.getPathname()).toBe('/');
  expect(stackRoutes(r.getRouterState())).toEqual(['(tabs)']);
});
