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

const CACHE_PREFIX = 'rfs.cache.';
const ADD_DEFAULTS_PREFIX = 'rfs.addDefaults.';

/** FNV-1a 32-bit, as 8 hex chars. Short and non-reversible; no dependency. */
export function hashBaseUrl(baseUrl: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < baseUrl.length; i++) {
    h ^= baseUrl.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Stable identity of a connection, used in query keys and AsyncStorage keys so data never mixes
 * between connections. A live connection is a hash of its (already normalized) baseUrl, so the
 * server address never lands in plain AsyncStorage.
 */
export function connectionIdentity(state: ConnectionState): string {
  return state.mode === 'live' ? hashBaseUrl(state.config.baseUrl) : state.mode;
}

export const cacheKeyFor = (identity: string) => `${CACHE_PREFIX}${identity}`;

async function clearSecrets(): Promise<void> {
  await SecureStore.deleteItemAsync(URL_KEY);
  await SecureStore.deleteItemAsync(KEY_KEY);
}

/** Drops every persisted query cache and every saved add-show default, for any connection. */
async function clearPerConnectionData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const doomed = keys.filter((k) => k.startsWith(CACHE_PREFIX) || k.startsWith(ADD_DEFAULTS_PREFIX));
  if (doomed.length) await AsyncStorage.multiRemove(doomed);
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
  await clearSecrets();
  await clearPerConnectionData();
  await AsyncStorage.setItem(MODE_KEY, 'sample');
}

export async function clearConnection(): Promise<ConnectionState> {
  await clearSecrets();
  await clearPerConnectionData();
  await AsyncStorage.removeItem(MODE_KEY);
  return { mode: 'none' };
}
