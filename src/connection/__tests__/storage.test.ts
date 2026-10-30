import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheKeyFor, clearConnection, connectionIdentity, hashBaseUrl, loadConnection, saveLive, saveSample } from '../storage';

beforeEach(async () => {
  await clearConnection();
  await AsyncStorage.clear();
});

test('saveLive then loadConnection returns the config', async () => {
  await saveLive({ baseUrl: 'http://192.168.1.50:8989', apiKey: 'abc' });
  expect(await loadConnection()).toEqual({
    mode: 'live',
    config: { baseUrl: 'http://192.168.1.50:8989', apiKey: 'abc' },
  });
});

test('the API key is never written to AsyncStorage', async () => {
  await saveLive({ baseUrl: 'http://192.168.1.50:8989', apiKey: 'abc' });
  const keys = await AsyncStorage.getAllKeys();
  const pairs = await AsyncStorage.multiGet(keys);
  expect(JSON.stringify(pairs)).not.toContain('abc');
});

test('saveSample loads as sample mode and drops stored credentials', async () => {
  await saveLive({ baseUrl: 'http://h:8989', apiKey: 'abc' });
  await saveSample();
  expect(await loadConnection()).toEqual({ mode: 'sample' });
});

const perConnectionKeys = async () =>
  (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('rfs.cache.') || k.startsWith('rfs.addDefaults.'));

async function seedPerConnectionData() {
  // Current and older connections, plus an unrelated key that must survive.
  await AsyncStorage.multiSet([
    [cacheKeyFor(hashBaseUrl('http://h:8989')), '{}'],
    [cacheKeyFor('deadbeef'), '{}'],
    [`rfs.addDefaults.${hashBaseUrl('http://h:8989')}`, '{}'],
    ['rfs.addDefaults.0badc0de', '{}'],
    ['other.key', 'keep'],
  ]);
}

test('clearConnection returns none and removes every cache and add-defaults key', async () => {
  await saveLive({ baseUrl: 'http://h:8989', apiKey: 'abc' });
  await seedPerConnectionData();
  await clearConnection();
  expect(await loadConnection()).toEqual({ mode: 'none' });
  expect(await perConnectionKeys()).toEqual([]);
  expect(await AsyncStorage.getItem('other.key')).toBe('keep');
});

test('saveSample removes every cache and add-defaults key', async () => {
  await saveLive({ baseUrl: 'http://h:8989', apiKey: 'abc' });
  await seedPerConnectionData();
  await saveSample();
  expect(await perConnectionKeys()).toEqual([]);
  expect(await AsyncStorage.getItem('other.key')).toBe('keep');
});

test('connection identity is a short hash, never the URL', () => {
  const id = connectionIdentity({ mode: 'live', config: { baseUrl: 'http://192.168.1.50:8989/sonarr', apiKey: 'k' } });
  expect(id).toMatch(/^[0-9a-f]{8}$/);
  expect(id).toBe(hashBaseUrl('http://192.168.1.50:8989/sonarr'));
  expect(id).not.toBe(hashBaseUrl('http://192.168.1.51:8989/sonarr'));
  expect(hashBaseUrl('')).toBe('811c9dc5'); // FNV-1a offset basis
  expect(hashBaseUrl('a')).toBe('e40c292c'); // FNV-1a 32 reference value
  expect(connectionIdentity({ mode: 'sample' })).toBe('sample');
});
