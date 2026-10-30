import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MonitorOption, QualityProfile, RootFolder, SeriesType } from '../api/types';

export type AddDefaults = {
  rootFolderPath: string;
  qualityProfileId: number;
  monitor: MonitorOption;
  seriesType: SeriesType;
  searchForMissingEpisodes: boolean;
};

const storageKey = (key: string) => `rfs.addDefaults.${key}`;

export async function loadAddDefaults(key: string): Promise<Partial<AddDefaults>> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(key));
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Partial<AddDefaults>) : {};
  } catch {
    return {};
  }
}

export async function saveAddDefaults(key: string, d: AddDefaults): Promise<void> {
  await AsyncStorage.setItem(storageKey(key), JSON.stringify(d));
}

/** Fills gaps in saved defaults; a saved folder or profile that no longer exists falls back to the first available. */
export function resolveAddDefaults(saved: Partial<AddDefaults>, folders: RootFolder[], profiles: QualityProfile[]): AddDefaults {
  const folder = folders.find((f) => f.path === saved.rootFolderPath)?.path ?? folders[0]?.path ?? '';
  const profile = profiles.find((p) => p.id === saved.qualityProfileId)?.id ?? profiles[0]?.id ?? 0;
  return {
    rootFolderPath: folder,
    qualityProfileId: profile,
    monitor: saved.monitor ?? 'all',
    seriesType: saved.seriesType ?? 'standard',
    searchForMissingEpisodes: saved.searchForMissingEpisodes ?? true,
  };
}
