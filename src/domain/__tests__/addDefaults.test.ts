import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadAddDefaults, resolveAddDefaults, saveAddDefaults } from '../addDefaults';

const folders = [{ id: 1, path: '/tv' }, { id: 2, path: '/anime' }];
const profiles = [{ id: 4, name: 'HD' }, { id: 5, name: 'UHD' }];

beforeEach(() => AsyncStorage.clear());

describe('resolveAddDefaults', () => {
  it('stale saved folder falls back to first', () => {
    const d = resolveAddDefaults({ rootFolderPath: '/gone', qualityProfileId: 99 }, folders, profiles);
    expect(d).toEqual({ rootFolderPath: '/tv', qualityProfileId: 4, monitor: 'all', seriesType: 'standard', searchForMissingEpisodes: true });
  });

  it('valid saved values kept', () => {
    const saved = { rootFolderPath: '/anime', qualityProfileId: 5, monitor: 'future' as const, seriesType: 'anime' as const, searchForMissingEpisodes: false };
    expect(resolveAddDefaults(saved, folders, profiles)).toEqual(saved);
  });
});

it('saves and loads under rfs.addDefaults.<key>', async () => {
  const d = { rootFolderPath: '/tv', qualityProfileId: 4, monitor: 'all' as const, seriesType: 'daily' as const, searchForMissingEpisodes: true };
  await saveAddDefaults('http://x', d);
  expect(await AsyncStorage.getItem('rfs.addDefaults.http://x')).toBe(JSON.stringify(d));
  expect(await loadAddDefaults('http://x')).toEqual(d);
  expect(await loadAddDefaults('other')).toEqual({});
});
