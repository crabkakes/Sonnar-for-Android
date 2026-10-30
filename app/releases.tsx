import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { userMessage } from '../src/api/errors';
import type { Release } from '../src/api/types';
import { useConnection } from '../src/connection/ConnectionProvider';
import { formatBytes } from '../src/domain/format';
import {
  filterReleases,
  formatAge,
  resolutionChips,
  sortReleases,
  type ReleaseSort,
} from '../src/domain/releases';
import { useSonarrMutation, useSonarrQuery } from '../src/query/hooks';
import { SampleBanner, StaleBanner } from '../src/ui/Banners';
import { Screen } from '../src/ui/Screen';
import { useTheme } from '../src/ui/theme';
import { useLayout } from '../src/ui/useLayout';

type Search = { status: 'loading' } | { status: 'done'; releases: Release[] } | { status: 'error'; error: unknown };

const SORTS: { key: ReleaseSort; label: string }[] = [
  { key: 'sonarr', label: 'Sonarr order' },
  { key: 'size', label: 'Size' },
  { key: 'seeders', label: 'Seeders' },
  { key: 'age', label: 'Age' },
];

const pad = (n: number) => String(n).padStart(2, '0');

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.chip, { borderColor: theme.border }, on && { backgroundColor: theme.accent, borderColor: theme.accent }]}
    >
      <Text style={{ color: on ? '#ffffff' : theme.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function ReleaseRow({ release, expanded, onToggle, onGrab }: {
  release: Release;
  expanded: boolean;
  onToggle: () => void;
  onGrab: () => void;
}) {
  const theme = useTheme();
  const summary = [
    release.quality?.quality?.name,
    formatBytes(release.size),
    release.protocol === 'torrent' && release.seeders !== undefined ? `${release.seeders} seeders` : undefined,
    release.releaseGroup,
  ].filter(Boolean);
  const languages = release.languages?.map((l) => l.name).join(', ');
  return (
    <Pressable
      testID={`release-row-${release.guid}`}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onToggle}
      style={[styles.row, { borderColor: theme.border }, release.rejected && { opacity: 0.55 }]}
    >
      <Text style={{ color: theme.text, fontWeight: '600' }}>
        {release.rejected ? '⚠ ' : ''}
        {summary.join(' · ')}
      </Text>
      {expanded ? (
        <View style={styles.details}>
          <Text selectable style={{ color: theme.text, fontSize: 13 }}>{release.title}</Text>
          <Text style={{ color: theme.muted, fontSize: 13 }}>
            {[release.indexer, `Age ${formatAge(release.ageHours)}`, languages].filter(Boolean).join(' · ')}
          </Text>
          {release.rejections.map((r, i) => (
            <Text key={i} style={{ color: theme.warning, fontSize: 13 }}>{r}</Text>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Grab"
            onPress={onGrab}
            style={[styles.btn, { backgroundColor: theme.accent }]}
          >
            <Text style={{ color: '#ffffff', fontWeight: '600' }}>Grab</Text>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function ReleasesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { api } = useConnection();
  const { maxContentWidth } = useLayout();
  const params = useLocalSearchParams<{ episodeId?: string; seriesId?: string; seasonNumber?: string }>();
  const episodeId = params.episodeId ? Number(params.episodeId) : undefined;
  const seriesId = params.seriesId ? Number(params.seriesId) : undefined;
  const seasonNumber = params.seasonNumber ? Number(params.seasonNumber) : undefined;

  const controllerRef = useRef<AbortController | null>(null);
  const [search, setSearch] = useState<Search>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [resolution, setResolution] = useState<number | undefined>();
  const [hideRejected, setHideRejected] = useState(false);
  const [sort, setSort] = useState<ReleaseSort>('sonarr');
  const [sortOpen, setSortOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // A release search is never cached: it lives in component state and is aborted on cancel, retry or unmount.
  useEffect(() => {
    if (!api) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    const q = episodeId !== undefined ? { episodeId } : { seriesId: seriesId ?? 0, seasonNumber: seasonNumber ?? 0 };
    api.getReleases(q, controller.signal).then(
      (releases) => {
        if (!controller.signal.aborted) setSearch({ status: 'done', releases });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setSearch({ status: 'error', error });
      },
    );
    return () => controller.abort();
  }, [api, attempt, episodeId, seriesId, seasonNumber]);

  const seriesQ = useSonarrQuery(['series', seriesId ?? 0], (a) => a.getSeriesById(seriesId!), { enabled: seriesId !== undefined });
  const episodesQ = useSonarrQuery(['episodes', seriesId ?? 0], (a) => a.getEpisodes(seriesId!), {
    enabled: seriesId !== undefined && episodeId !== undefined,
  });
  const episode = episodesQ.data?.find((e) => e.id === episodeId);
  const what = episodeId !== undefined
    ? episode ? `S${pad(episode.seasonNumber)}E${pad(episode.episodeNumber)}` : undefined
    : seasonNumber !== undefined ? `Season ${seasonNumber}` : undefined;
  const title = [seriesQ.data?.title, what].filter(Boolean).join(' · ') || 'Releases';

  const grab = useSonarrMutation((a, r: Pick<Release, 'guid' | 'indexerId'>) => a.grabRelease(r), {
    successMessage: 'Sent to download client',
    invalidate: [['queue']],
  });

  const all = useMemo(() => (search.status === 'done' ? search.releases : []), [search]);
  const chips = useMemo(() => resolutionChips(all), [all]);
  const shown = useMemo(
    () => sortReleases(filterReleases(all, { resolution, hideRejected }), sort),
    [all, resolution, hideRejected, sort],
  );

  function onGrab(r: Release) {
    const send = () => void grab.run({ guid: r.guid, indexerId: r.indexerId });
    if (!r.rejected) return send();
    Alert.alert('Grab rejected release?', `Sonarr rejected this release:\n${r.rejections.join('\n')}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Grab anyway', style: 'destructive', onPress: send },
    ]);
  }

  function cancel() {
    controllerRef.current?.abort();
    router.back();
  }

  function retry() {
    setSearch({ status: 'loading' });
    setExpanded(null);
    setAttempt((n) => n + 1);
  }

  let body;
  if (search.status === 'loading') {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
        <Text style={{ color: theme.text }}>Searching indexers…</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={cancel} style={styles.btn}>
          <Text style={{ color: theme.text, fontWeight: '600' }}>Cancel</Text>
        </Pressable>
      </View>
    );
  } else if (search.status === 'error') {
    const msg = userMessage(search.error);
    body = (
      <View style={styles.center}>
        <Text style={[styles.heading, { color: theme.text }]}>{msg.title}</Text>
        <Text style={{ color: theme.muted, textAlign: 'center' }}>{msg.detail}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Retry" onPress={retry} style={[styles.btn, { backgroundColor: theme.accent }]}>
          <Text style={{ color: '#ffffff', fontWeight: '600' }}>Retry</Text>
        </Pressable>
      </View>
    );
  } else {
    body = (
      <FlatList
        testID="release-list"
        data={shown}
        extraData={expanded}
        keyExtractor={(r) => r.guid}
        renderItem={({ item }) => (
          <ReleaseRow
            release={item}
            expanded={expanded === item.guid}
            onToggle={() => setExpanded(expanded === item.guid ? null : item.guid)}
            onGrab={() => onGrab(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={[styles.pad, { color: theme.muted, textAlign: 'center' }]}>
            {all.length === 0 ? 'No releases found' : 'No releases match these filters'}
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    );
  }

  return (
    <Screen>
      <SampleBanner />
      <StaleBanner />
      <View style={{ width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', flex: 1 }}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.icon}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[styles.heading, { color: theme.text }]}>{title}</Text>
            {search.status === 'done' ? (
              <Text style={{ color: theme.muted, fontSize: 13 }}>
                {shown.length === 1 ? '1 release' : `${shown.length} releases`}
              </Text>
            ) : null}
          </View>
        </View>
        {search.status === 'done' && all.length > 0 ? (
          <View style={styles.filters}>
            <Chip label="All" on={resolution === undefined} onPress={() => setResolution(undefined)} />
            {chips.map((res) => (
              <Chip key={res} label={`${res}p`} on={resolution === res} onPress={() => setResolution(res)} />
            ))}
            <Chip label="Hide rejected" on={hideRejected} onPress={() => setHideRejected((v) => !v)} />
            <Chip label="Sort" on={sortOpen} onPress={() => setSortOpen((v) => !v)} />
          </View>
        ) : null}
        {sortOpen && search.status === 'done' ? (
          <View style={styles.filters}>
            {SORTS.map((s) => (
              <Chip
                key={s.key}
                label={s.label}
                on={sort === s.key}
                onPress={() => {
                  setSort(s.key);
                  setSortOpen(false);
                }}
              />
            ))}
          </View>
        ) : null}
        {body}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingRight: 16 },
  icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 18, fontWeight: '700' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderWidth: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  row: { paddingHorizontal: 16, paddingVertical: 14, minHeight: 48, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  details: { gap: 6 },
  btn: { minHeight: 44, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  center: { padding: 32, alignItems: 'center', gap: 12 },
  pad: { padding: 24 },
});
