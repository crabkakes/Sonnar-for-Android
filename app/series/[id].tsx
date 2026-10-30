import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, SectionList, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { userMessage } from '../../src/api/errors';
import type { Episode, Series } from '../../src/api/types';
import { formatAirTime } from '../../src/domain/format';
import { episodeStatus, groupSeasons, type SeasonGroup } from '../../src/domain/series';
import { useSonarrMutation, useSonarrQuery } from '../../src/query/hooks';
import { SampleBanner, StaleBanner } from '../../src/ui/Banners';
import { Poster } from '../../src/ui/Poster';
import { Screen } from '../../src/ui/Screen';
import { useTheme } from '../../src/ui/theme';
import { useLayout } from '../../src/ui/useLayout';

type Target = { kind: 'episode'; episode: Episode } | { kind: 'season'; season: SeasonGroup };

const epCode = (e: Episode) => `${e.seasonNumber}x${String(e.episodeNumber).padStart(2, '0')}`;

function StatusChip({ episode, now }: { episode: Episode; now: Date }) {
  const theme = useTheme();
  const st = episodeStatus(episode, now);
  const [label, color] =
    st.kind === 'downloaded'
      ? [st.quality ?? 'Downloaded', theme.success]
      : st.kind === 'missing'
      ? ['Missing', theme.danger]
      : st.kind === 'unaired'
      ? [st.at ? formatAirTime(st.at, now) : 'TBA', theme.muted]
      : ['Unmonitored', theme.muted];
  return <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>;
}

export default function SeriesDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { maxContentWidth } = useLayout();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const now = useMemo(() => new Date(), []);

  const seriesQ = useSonarrQuery(['series', id], (api) => api.getSeriesById(id));
  const episodesQ = useSonarrQuery(['episodes', id], (api) => api.getEpisodes(id));
  const profilesQ = useSonarrQuery(['qualityProfiles'], (api) => api.getQualityProfiles());
  const series = seriesQ.data;

  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [target, setTarget] = useState<Target | null>(null);

  const refresh: unknown[][] = [['series', id], ['series'], ['episodes', id]];
  const saveSeries = useSonarrMutation((api, s: Series) => api.updateSeries(s), { successMessage: 'Saved', invalidate: refresh });
  const setEpMonitored = useSonarrMutation((api, v: { ids: number[]; monitored: boolean }) => api.setEpisodesMonitored(v.ids, v.monitored), {
    successMessage: 'Saved',
    invalidate: [['episodes', id], ['series']],
  });
  const searchEp = useSonarrMutation((api, ids: number[]) => api.searchEpisodes(ids), { successMessage: 'Search started', invalidate: [] });
  const searchSeason = useSonarrMutation((api, n: number) => api.searchSeason(id, n), { successMessage: 'Search started', invalidate: [] });
  const deleted = useRef(false);
  const remove = useSonarrMutation(
    async (api, deleteFiles: boolean) => {
      await api.deleteSeries(id, deleteFiles);
      deleted.current = true;
    },
    { successMessage: 'Show deleted', invalidate: [['series']] },
  );

  const seasons = useMemo(() => (series ? groupSeasons(series, episodesQ.data ?? []) : []), [series, episodesQ.data]);
  const newest = seasons[0]?.seasonNumber;
  const isOpen = (n: number) => open[n] ?? n === newest;
  const sections = seasons.map((g) => ({ ...g, data: isOpen(g.seasonNumber) ? g.episodes : [] }));
  const profile = profilesQ.data?.find((p) => p.id === series?.qualityProfileId)?.name;

  function toggleSeasonMonitored(g: SeasonGroup) {
    if (!series) return;
    void saveSeries.run({ ...series, seasons: series.seasons.map((s) => (s.seasonNumber === g.seasonNumber ? { ...s, monitored: !g.monitored } : s)) });
  }

  function confirmDelete() {
    const go = async (files: boolean) => {
      await remove.run(files);
      if (deleted.current) router.back();
    };
    Alert.alert('Delete show', `Remove ${series?.title ?? 'this show'} from Sonarr?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete show', style: 'destructive', onPress: () => go(false) },
      { text: 'Delete show and files', style: 'destructive', onPress: () => go(true) },
    ]);
  }

  function act(fn: () => void) {
    setTarget(null);
    fn();
  }

  const header = series ? (
    <View style={styles.headerBlock}>
      <Poster seriesId={series.id} size="large" title={series.title} />
      <View style={styles.headerBody}>
        <Text style={[styles.title, { color: theme.text }]}>{series.title}</Text>
        <Text style={{ color: theme.muted }}>{[series.year, series.network].filter(Boolean).join(' · ')}</Text>
        <Text style={{ color: theme.muted }}>
          {[profile, `${seasons.filter((g) => g.seasonNumber > 0).length} seasons`].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.switchRow}>
          <Text style={{ color: theme.text }}>Monitored</Text>
          <Switch accessibilityLabel="Monitored" value={series.monitored} onValueChange={(v) => void saveSeries.run({ ...series, monitored: v })} />
        </View>
      </View>
    </View>
  ) : null;

  const footer = series ? (
    <Pressable accessibilityRole="button" accessibilityLabel="Delete show" onPress={confirmDelete} style={[styles.deleteBtn, { borderColor: theme.danger }]}>
      <Text style={{ color: theme.danger, fontWeight: '600', fontSize: 16 }}>Delete show</Text>
    </Pressable>
  ) : null;

  let empty: React.ReactElement | null = null;
  if (seriesQ.isLoading) empty = <ActivityIndicator color={theme.accent} style={styles.pad} />;
  else if (!series && seriesQ.error) {
    const m = userMessage(seriesQ.error);
    empty = (
      <View style={styles.pad}>
        <Text style={[styles.title, { color: theme.text }]}>{m.title}</Text>
        <Text style={{ color: theme.muted }}>{m.detail}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Retry" onPress={seriesQ.refetch} style={[styles.btn, { backgroundColor: theme.accent }]}>
          <Text style={styles.btnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const sheetTitle = target?.kind === 'episode' ? epCode(target.episode) : target?.season.title;
  const targetMonitored = target?.kind === 'episode' ? target.episode.monitored : target?.season.monitored;

  return (
    <Screen>
      <SampleBanner />
      <StaleBanner />
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.icon}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </Pressable>
      </View>
      <SectionList
        style={{ width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' }}
        sections={sections}
        keyExtractor={(e) => String(e.id)}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={header ?? undefined}
        ListFooterComponent={footer ?? undefined}
        ListEmptyComponent={empty ?? undefined}
        initialNumToRender={20}
        windowSize={7}
        contentContainerStyle={{ paddingBottom: 48 }}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={section.title}
              onPress={() => setOpen((o) => ({ ...o, [section.seasonNumber]: !isOpen(section.seasonNumber) }))}
              style={styles.sectionMain}
            >
              <Ionicons name={isOpen(section.seasonNumber) ? 'chevron-down' : 'chevron-forward'} size={18} color={theme.muted} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
              <Text style={{ color: theme.muted }}>{`${section.have}/${section.total}`}</Text>
              {!section.monitored && <Ionicons name="bookmark-outline" size={16} color={theme.muted} />}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Actions for ${section.title}`} onPress={() => setTarget({ kind: 'season', season: section })} style={styles.icon}>
              <Ionicons name="ellipsis-horizontal" size={22} color={theme.text} />
            </Pressable>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[styles.epRow, { borderColor: theme.border }]}>
            <Text style={{ color: theme.muted, width: 48 }}>{epCode(item)}</Text>
            <View style={styles.epBody}>
              <Text numberOfLines={1} style={{ color: theme.text, fontSize: 15 }}>{item.title || 'TBA'}</Text>
              <StatusChip episode={item} now={now} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Actions for episode ${epCode(item)}`} onPress={() => setTarget({ kind: 'episode', episode: item })} style={styles.icon}>
              <Ionicons name="ellipsis-horizontal" size={22} color={theme.text} />
            </Pressable>
          </View>
        )}
      />
      <Modal transparent animationType="fade" visible={target !== null} onRequestClose={() => setTarget(null)}>
        <Pressable style={styles.backdrop} onPress={() => setTarget(null)} accessibilityLabel="Close actions" />
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>{sheetTitle}</Text>
          <SheetButton
            label="Search"
            onPress={() => target && act(() => void (target.kind === 'episode' ? searchEp.run([target.episode.id]) : searchSeason.run(target.season.seasonNumber)))}
          />
          <SheetButton
            label="Pick a release"
            onPress={() =>
              target &&
              act(() =>
                router.push(
                  (target.kind === 'episode'
                    ? { pathname: '/releases', params: { episodeId: target.episode.id } }
                    : { pathname: '/releases', params: { seriesId: id, seasonNumber: target.season.seasonNumber } }) as never,
                ),
              )
            }
          />
          <SheetButton
            label={targetMonitored ? 'Unmonitor' : 'Monitor'}
            onPress={() =>
              target &&
              act(() =>
                target.kind === 'episode'
                  ? void setEpMonitored.run({ ids: [target.episode.id], monitored: !target.episode.monitored })
                  : toggleSeasonMonitored(target.season),
              )
            }
          />
          <SheetButton label="Cancel" onPress={() => setTarget(null)} />
        </View>
      </Modal>
    </Screen>
  );
}

function SheetButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.sheetBtn}>
      <Text style={{ color: theme.text, fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', paddingHorizontal: 8 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerBlock: { flexDirection: 'row', gap: 16, padding: 16 },
  headerBody: { flex: 1, gap: 4 },
  title: { fontSize: 22, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, borderBottomWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  sectionMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  epRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  epBody: { flex: 1, gap: 2 },
  deleteBtn: { margin: 16, minHeight: 48, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pad: { padding: 24, gap: 12 },
  btn: { minHeight: 44, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { padding: 16, paddingBottom: 32, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  sheetBtn: { minHeight: 48, justifyContent: 'center' },
});
