import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCalendars } from 'expo-localization';
import { useRouter } from 'expo-router';
import { userMessage } from '../../src/api/errors';
import type { Episode } from '../../src/api/types';
import { buildWeek, groupByLocalDay, localDayKey, type FirstWeekday } from '../../src/domain/calendar';
import { episodeStatus } from '../../src/domain/series';
import { useSonarrQuery } from '../../src/query/hooks';
import { Screen } from '../../src/ui/Screen';
import { SampleBanner, StaleBanner } from '../../src/ui/Banners';
import { Poster } from '../../src/ui/Poster';
import { useTheme } from '../../src/ui/theme';
import { useLayout } from '../../src/ui/useLayout';

const HALF_DAY = 12 * 3_600_000;

function deviceCalendar(): { firstWeekday: FirstWeekday; tz: string } {
  let cal: ReturnType<typeof getCalendars>[number] | undefined;
  try {
    cal = getCalendars()[0];
  } catch {
    cal = undefined;
  }
  const fw = cal?.firstWeekday;
  return {
    firstWeekday: fw && fw >= 1 && fw <= 7 ? (fw as FirstWeekday) : 1,
    tz: cal?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

const code = (e: Episode) =>
  `S${String(e.seasonNumber).padStart(2, '0')}E${String(e.episodeNumber).padStart(2, '0')}`;

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { maxContentWidth } = useLayout();
  const { firstWeekday, tz } = useState(deviceCalendar)[0];
  const [now] = useState(() => new Date());
  const todayKey = localDayKey(now.toISOString(), tz);
  const [view, setView] = useState({ anchor: now, selected: todayKey });
  const { anchor, selected } = view;

  const week = useMemo(() => buildWeek(anchor, firstWeekday, tz), [anchor, firstWeekday, tz]);
  const { data, isLoading, error, refetch } = useSonarrQuery(['calendar', week.startUtc], (api) =>
    api.getCalendar(week.startUtc, week.endUtc),
  );
  const byDay = useMemo(() => groupByLocalDay(data ?? [], tz), [data, tz]);
  const rows = byDay[selected] ?? [];

  const go = useCallback(
    (dir: 1 | -1) =>
      setView((v) => {
        const w = buildWeek(v.anchor, firstWeekday, tz);
        const next = new Date(dir === 1 ? new Date(w.endUtc).getTime() + HALF_DAY : new Date(w.startUtc).getTime() - HALF_DAY);
        return { anchor: next, selected: buildWeek(next, firstWeekday, tz).days[0].key };
      }),
    [firstWeekday, tz],
  );
  const goToday = () => setView({ anchor: now, selected: todayKey });
  const select = (key: string) => setView((v) => ({ ...v, selected: key }));

  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -50) go(1);
        else if (g.dx >= 50) go(-1);
      },
    }),
  );

  const monthLabel = new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(
    new Date(`${week.days[3].key}T00:00:00Z`),
  );
  const timeFmt = useMemo(() => new Intl.DateTimeFormat(undefined, { timeZone: tz, hour: 'numeric', minute: '2-digit' }), [tz]);

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
  } else empty = <Text style={[styles.pad, { color: theme.muted, textAlign: 'center' }]}>Nothing airing</Text>;

  function chip(e: Episode) {
    const s = episodeStatus(e, now);
    switch (s.kind) {
      case 'downloaded': return { text: 'Downloaded', color: theme.success };
      case 'missing': return { text: 'Missing', color: theme.danger };
      case 'unmonitored': return { text: 'Unmonitored', color: theme.muted };
      default: return { text: 'Unaired', color: theme.accent };
    }
  }

  return (
    <Screen>
      <SampleBanner />
      <StaleBanner />
      <View style={{ width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', flex: 1 }}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous week" onPress={() => go(-1)} style={styles.icon}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.month, { color: theme.text }]}>{monthLabel}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Today" onPress={goToday} style={styles.todayBtn}>
            <Text style={{ color: theme.accent, fontWeight: '600' }}>Today</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next week" onPress={() => go(1)} style={styles.icon}>
            <Ionicons name="chevron-forward" size={24} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.strip} {...pan.panHandlers}>
          {week.days.map((d) => {
            const isSel = d.key === selected;
            return (
              <Pressable
                key={d.key}
                testID={`day-${d.key}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                onPress={() => select(d.key)}
                style={[styles.day, isSel && { backgroundColor: theme.accent }, !isSel && d.key === todayKey && { borderColor: theme.accent, borderWidth: 1 }]}
              >
                <Text style={{ color: isSel ? '#ffffff' : theme.muted, fontSize: 12 }}>{d.label}</Text>
                <Text style={{ color: isSel ? '#ffffff' : theme.text, fontSize: 16, fontWeight: '600' }}>{d.dayOfMonth}</Text>
                <View
                  testID={byDay[d.key] ? `dot-${d.key}` : undefined}
                  style={[styles.dot, { backgroundColor: byDay[d.key] ? (isSel ? '#ffffff' : theme.accent) : 'transparent' }]}
                />
              </Pressable>
            );
          })}
        </View>
        <FlatList
          data={rows}
          keyExtractor={(e) => String(e.id)}
          ListEmptyComponent={empty ?? undefined}
          renderItem={({ item }) => {
            const c = chip(item);
            const title = item.series?.title ?? 'Unknown series';
            return (
              <Pressable
                testID={`episode-row-${item.id}`}
                accessibilityRole="button"
                onPress={() => router.push(`/series/${item.seriesId}`)}
                style={[styles.row, { borderColor: theme.border }]}
              >
                <Poster seriesId={item.seriesId} size="small" title={title} />
                <View style={styles.rowBody}>
                  <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>{title}</Text>
                  <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 13 }}>
                    {code(item)}{item.title ? ` · ${item.title}` : ''}
                  </Text>
                  <View style={styles.meta}>
                    <Text style={{ color: theme.muted, fontSize: 13 }}>{timeFmt.format(new Date(item.airDateUtc!)).replace(/[  ]/g, ' ')}</Text>
                    <Text style={{ color: c.color, fontSize: 13, fontWeight: '600' }}>{c.text}</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  month: { flex: 1, fontSize: 18, fontWeight: '600', paddingLeft: 8 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  todayBtn: { minHeight: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  strip: { flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 8, gap: 4 },
  day: { flex: 1, minHeight: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth },
  rowBody: { flex: 1, gap: 2, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { flexDirection: 'row', gap: 12 },
  pad: { padding: 24 },
  emptyWrap: { padding: 32, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  btn: { minHeight: 44, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
});
