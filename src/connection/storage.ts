import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { ConnectionConfig } from '../api/types';

export type ConnectionState =
  | { mode: 'none' }
  | { mode: 'live'; config: ConnectionConfig }
  | { mode: 'sample' };

const URL_KEY = 'rfs.baseUrl';
const KEY_KEY = 'rfs.apiKey';
const MODE_KEY = 'rfs.mode';

export const cacheKeyFor = (baseUrl: string) => `rfs.cache.${baseUrl}`;

async function clearSecrets(): Promise<string | null> {
  const previous = await SecureStore.getItemAsync(URL_KEY);
  await SecureStore.deleteItemAsync(URL_KEY);
  await SecureStore.deleteItemAsync(KEY_KEY);
  return previous;
}

export async function loadConnection(): Promise<ConnectionState> {
  const mode = await AsyncStorage.getItem(MODE_KEY);
  if (mode === 'sample') return { mode: 'sample' };
  if (mode === 'live') {
    const [baseUrl, apiKey] = await Promise.all([
      SecureStore.getItemAsync(URL_KEY),
      SecureStore.getItemAsync(KEY_KEY),
    ]);
    if (baseUrl && apiKey) return { mode: 'live', config: { baseUrl, apiKey } };
  }
  return { mode: 'none' };
}

export async function saveLive(c: ConnectionConfig): Promise<void> {
  await SecureStore.setItemAsync(URL_KEY, c.baseUrl);
  await SecureStore.setItemAsync(KEY_KEY, c.apiKey);
  await AsyncStorage.setItem(MODE_KEY, 'live');
}

export async function saveSample(): Promise<void> {
  const previous = await clearSecrets();
  if (previous) await AsyncStorage.removeItem(cacheKeyFor(previous));
  await AsyncStorage.setItem(MODE_KEY, 'sample');
}

export async function clearConnection(): Promise<ConnectionState> {
  const previous = await clearSecrets();
  if (previous) await AsyncStorage.removeItem(cacheKeyFor(previous));
  await AsyncStorage.removeItem(MODE_KEY);
  return { mode: 'none' };
}
