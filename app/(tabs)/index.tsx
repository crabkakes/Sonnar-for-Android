import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { userMessage } from '../../src/api/errors';
import type { Series } from '../../src/api/types';
import { formatAirTime } from '../../src/domain/format';
import { seriesSummary } from '../../src/domain/series';
import { useSonarrQuery } from '../../src/query/hooks';
import { Screen } from '../../src/ui/Screen';
import { SampleBanner, StaleBanner } from '../../src/ui/Banners';
import { Poster } from '../../src/ui/Poster';
import { useTheme, type Theme } from '../../src/ui/theme';
import { useLayout } from '../../src/ui/useLayout';

const sortKey = (s: Series) => (s.sortTitle ?? s.title).toLowerCase();

function statusText(status: ReturnType<typeof seriesSummary>['status'], now: Date): string {
  switch (status.kind) {
    case 'missing':
      return `${status.count} missing`;
    case 'next':
      return `Next: ${formatAirTime(status.at, now)}`;
    case 'ended':
      return 'Ended';
    default:
      return '';
  }
}

function statusColor(kind: string, theme: Theme): string {
  return kind === 'missing' ? theme.danger : kind === 'next' ? theme.accent : theme.muted;
}

function ProgressBar({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: theme.border }]}>
      <View style={{ width: `${Math.round(value * 100)}%`, height: 4, backgroundColor: theme.success }} />
    </View>
  );
}

function SeriesItem({ s, grid, onPress }: { s: Series; grid: boolean; onPress: () => void }) {
  const theme = useTheme();
  const now = useMemo(() => new Date(), []);
  const sum = seriesSummary(s, now);
  const text = statusText(sum.status, now);
  const color = statusColor(sum.status.kind, theme);
  if (grid) {
    return (
      <Pressable testID={`series-row-${s.id}`} accessibilityRole="button" onPress={onPress} style={styles.cell}>
        <Poster seriesId={s.id} size="large" title={s.title} />
        <Text numberOfLines={1} style={[styles.cellTitle, { color: theme.text }]}>{s.title}</Text>
        {text !== '' && <Text numberOfLines={1} style={{ color, fontSize: 12 }}>{text}</Text>}
      </Pressable>
    );
  }
  return (
    <Pressable testID={`series-row-${s.id}`} accessibilityRole="button" onPress={onPress} style={[styles.row, { borderColor: theme.border }]}>
      <Poster seriesId={s.id} size="small" title={s.title} />
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>{s.title}</Text>
        <Text style={{ color: theme.muted, fontSize: 13 }}>{sum.counts}</Text>
        {text !== '' && <Text style={{ color, fontSize: 13, fontWeight: '600' }}>{text}</Text>}
        <ProgressBar value={sum.progress} />
      </View>
    </Pressable>
  );
}

export default function ShowsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { columns, maxContentWidth, isWide } = useLayout();
  const { data, isLoading, error, refetch } = useSonarrQuery(['series'], (api) => api.getSeries());
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const sorted = useMemo(() => [...(data ?? [])].sort((a, b) => sortKey(a).localeCompare(sortKey(b))), [data]);
  const q = search.trim().toLowerCase();
  const shown = useMemo(() => (q ? sorted.filter((s) => s.title.toLowerCase().includes(q)) : sorted), [sorted, q]);

  async function onRefresh() {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 600);
  }

  let empty: React.ReactElement | null = null;
  if (isLoading) empty = <ActivityIndicator color={theme.accent} style={styles.pad} />;
  else if (data === undefined && error) {
    const m = userMessage(error);
    empty = (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>{m.title}</Text>
        <Text style={{ color: theme.muted, textAlign: 'center' }}>{m.detail}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Retry" onPress={refetch} style={[styles.btn, { backgroundColor: theme.accent }]}>
          <Text style={styles.btnText}>Retry</Text>
        </Pressable>
      </View>
    );
  } else if (data !== undefined && data.length === 0) {
    empty = (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No shows yet</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Add a show" onPress={() => router.push('/add' as never)} style={[styles.btn, { backgroundColor: theme.accent }]}>
          <Text style={styles.btnText}>Add a show</Text>
        </Pressable>
      </View>
    );
  } else if (data !== undefined) {
    empty = <Text style={[styles.pad, { color: theme.muted, textAlign: 'center' }]}>No matches</Text>;
  }

  return (
    <Screen>
      <SampleBanner />
      <StaleBanner />
      <View style={[styles.header, { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' }]}>
        <TextInput
          accessibilityLabel="Search shows"
          placeholder="Search shows"
          placeholderTextColor={theme.muted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          style={[styles.search, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Server settings" onPress={() => router.push('/server' as never)} style={styles.icon}>
          <Ionicons name="settings-outline" size={24} color={theme.text} />
        </Pressable>
      </View>
      <FlatList
        key={isWide ? `grid-${columns}` : 'list'}
        style={{ width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' }}
        data={shown}
        numColumns={isWide ? columns : 1}
        keyExtractor={(s) => String(s.id)}
        renderItem={({ item }) => <SeriesItem s={item} grid={isWide} onPress={() => router.push(`/series/${item.id}`)} />}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        ListEmptyComponent={empty ?? undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 96 }}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Add show" onPress={() => router.push('/add' as never)} style={[styles.fab, { backgroundColor: theme.accent }]}>
        <Ionicons name="add" size={28} color="#ffffff" />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  search: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 16 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth },
  rowBody: { flex: 1, gap: 2, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  cell: { flex: 1, padding: 8, gap: 4, alignItems: 'flex-start' },
  cellTitle: { fontSize: 14, fontWeight: '600', width: 120 },
  pad: { padding: 24 },
  emptyWrap: { padding: 32, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  btn: { minHeight: 44, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  fab: { position: 'absolute', right: 16, bottom: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
