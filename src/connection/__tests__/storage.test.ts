import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearConnection, loadConnection, saveLive, saveSample } from '../storage';

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

test('clearConnection returns none and removes the cache key', async () => {
  await saveLive({ baseUrl: 'http://h:8989', apiKey: 'abc' });
  await AsyncStorage.setItem('rfs.cache.http://h:8989', '{}');
  await clearConnection();
  expect(await loadConnection()).toEqual({ mode: 'none' });
  expect(await AsyncStorage.getItem('rfs.cache.http://h:8989')).toBeNull();
});
