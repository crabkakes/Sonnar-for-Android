import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { userMessage } from '../../src/api/errors';
import type { HistoryItem, QueueItem } from '../../src/api/types';
import { episodeCode, formatRelative } from '../../src/domain/format';
import { historyEventLabel, queueItemView } from '../../src/domain/queue';
import { useSonarrInfiniteQuery, useSonarrMutation, useSonarrQuery } from '../../src/query/hooks';
import { SampleBanner, StaleBanner } from '../../src/ui/Banners';
import { Screen } from '../../src/ui/Screen';
import { useTheme, type Theme } from '../../src/ui/theme';
import { useLayout } from '../../src/ui/useLayout';

const HISTORY_PAGE_SIZE = 50;
const QUEUE_PAGE_SIZE = 100;
const POLL_MS = 5000;

type RemoveRequest = { id: number; blocklist: boolean };
type RemoveVars = RemoveRequest & { removeFromClient: boolean };

const code = (e?: { seasonNumber: number; episodeNumber: number }) => (e ? episodeCode(e) : '');

function toneColor(theme: Theme, tone: 'normal' | 'warning' | 'error') {
  return tone === 'error' ? theme.danger : tone === 'warning' ? theme.warning : theme.muted;
}

function QueueRow({ item, onRemove }: { item: QueueItem; onRemove: (r: RemoveRequest) => void }) {
  const theme = useTheme();
  const v = queueItemView(item);
  return (
    <View testID={`queue-row-${item.id}`} style={[styles.row, { borderColor: theme.border }]}>
      <View style={styles.between}>
        <Text numberOfLines={1} style={[styles.title, styles.shrink, { color: theme.text }]}>{v.title}</Text>
        <Text testID={`queue-status-${item.id}`} style={{ color: v.status === 'Failed' ? theme.danger : theme.accent, fontWeight: '600', fontSize: 13 }}>
          {v.status}
        </Text>
      </View>
      {v.subtitle ? <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 13 }}>{v.subtitle}</Text> : null}
      {v.progress !== null ? (
        <View style={[styles.track, { backgroundColor: theme.border }]}>
          <View style={{ width: `${Math.round(v.progress * 100)}%`, height: 6, backgroundColor: theme.accent }} />
        </View>
      ) : null}
      {v.timeLeft ? <Text style={{ color: theme.muted, fontSize: 13 }}>{v.timeLeft}</Text> : null}
      {v.messages.map((m, i) => (
        <Text key={i} style={{ color: toneColor(theme, v.tone), fontSize: 13 }}>{m}</Text>
      ))}
      <View style={styles.actions}>
        <Pressable
          testID={`remove-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${v.title}`}
          onPress={() => onRemove({ id: item.id, blocklist: false })}
          style={styles.action}
        >
          <Text style={{ color: theme.danger, fontWeight: '600' }}>Remove</Text>
        </Pressable>
        <Pressable
          testID={`block-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Remove and block ${v.title}`}
          onPress={() => onRemove({ id: item.id, blocklist: true })}
          style={styles.action}
        >
          <Text style={{ color: theme.danger, fontWeight: '600' }}>Remove + block</Text>
        </Pressable>
      </View>
    </View>
  );
}

function HistoryRow({ item, now }: { item: HistoryItem; now: Date }) {
  const theme = useTheme();
  const meta = [code(item.episode), item.quality?.quality?.name].filter(Boolean).join(' · ');
  return (
    <View testID={`history-row-${item.id}`} style={[styles.row, { borderColor: theme.border }]}>
      <View style={styles.between}>
        <Text style={{ color: theme.accent, fontWeight: '600' }}>{historyEventLabel(item.eventType)}</Text>
        <Text style={{ color: theme.muted, fontSize: 13 }}>{formatRelative(item.date, now)}</Text>
      </View>
      {item.series?.title ? <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>{item.series.title}</Text> : null}
      {meta ? <Text style={{ color: theme.muted, fontSize: 13 }}>{meta}</Text> : null}
      <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>{item.sourceTitle}</Text>
    </View>
  );
}

function ConfirmRemove({ request, onClose, onConfirm }: {
  request: RemoveRequest | null;
  onClose: () => void;
  onConfirm: (v: RemoveVars) => void;
}) {
  return (
    <Modal visible={request !== null} transparent animationType="fade" onRequestClose={onClose}>
      {request ? <ConfirmDialog request={request} onClose={onClose} onConfirm={onConfirm} /> : null}
    </Modal>
  );
}

// Mounted only while open, so the switch starts on every time.
function ConfirmDialog({ request, onClose, onConfirm }: {
  request: RemoveRequest;
  onClose: () => void;
  onConfirm: (v: RemoveVars) => void;
}) {
  const theme = useTheme();
  const [removeFromClient, setRemoveFromClient] = useState(true);
  return (
    <View style={styles.backdrop}>
      <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.text }]}>{request.blocklist ? 'Remove and block release?' : 'Remove from queue?'}</Text>
        <View style={styles.between}>
          <Text style={{ color: theme.text, flex: 1 }}>Also remove from download client</Text>
          <Switch testID="remove-from-client-switch" value={removeFromClient} onValueChange={setRemoveFromClient} />
        </View>
        <View style={styles.dialogActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={onClose} style={styles.action}>
            <Text style={{ color: theme.text, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
          <Pressable
            testID="confirm-remove"
            accessibilityRole="button"
            accessibilityLabel="Remove"
            onPress={() => onConfirm({ ...request, removeFromClient })}
            style={styles.action}
          >
            <Text style={{ color: theme.danger, fontWeight: '600' }}>Remove</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ErrorState({ error, onRetry }: { error: Parameters<typeof userMessage>[0]; onRetry: () => void }) {
  const theme = useTheme();
  const m = userMessage(error);
  return (
    <View style={styles.emptyWrap}>
      <Text style={[styles.title, { color: theme.text }]}>{m.title}</Text>
      <Text style={{ color: theme.muted, textAlign: 'center' }}>{m.detail}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Retry" onPress={onRetry} style={[styles.btn, { backgroundColor: theme.accent }]}>
        <Text style={{ color: '#ffffff', fontWeight: '600' }}>Retry</Text>
      </Pressable>
    </View>
  );
}

export default function ActivityScreen() {
  const theme = useTheme();
  const { maxContentWidth } = useLayout();
  const focused = useIsFocused();
  const [tab, setTab] = useState<'queue' | 'history'>('queue');
  const [pending, setPending] = useState<RemoveRequest | null>(null);
  const now = useMemo(() => new Date(), []);

  // Polls only while this tab is focused; TanStack's focusManager (AppState) pauses it in the background.
  const queue = useSonarrQuery(['queue'], (api) => api.getQueue(1, QUEUE_PAGE_SIZE), {
    refetchInterval: focused ? POLL_MS : undefined,
  });
  const history = useSonarrInfiniteQuery(
    ['history'],
    (api, page) => api.getHistory(page, HISTORY_PAGE_SIZE),
    (last, all) => (all.reduce((n, p) => n + p.records.length, 0) < last.totalRecords ? all.length + 1 : undefined),
  );
  const remove = useSonarrMutation(
    (api, v: RemoveVars) => api.removeQueueItem(v.id, { blocklist: v.blocklist, removeFromClient: v.removeFromClient }),
    { successMessage: 'Removed from queue', invalidate: [['queue']] },
  );

  const queueRecords = queue.data?.records ?? [];
  const historyRecords = history.pages.flatMap((p) => p.records);
  const count = queue.data?.totalRecords ?? queueRecords.length;

  const tabs = [
    { key: 'queue' as const, label: queue.data ? `Queue (${count})` : 'Queue' },
    { key: 'history' as const, label: 'History' },
  ];

  const loadingEl = <ActivityIndicator color={theme.accent} style={styles.pad} />;
  const queueEmpty = queue.isLoading ? loadingEl : queue.error && !queue.data
    ? <ErrorState error={queue.error} onRetry={queue.refetch} />
    : <Text style={[styles.pad, { color: theme.muted, textAlign: 'center' }]}>Nothing downloading</Text>;
  const historyEmpty = history.isLoading ? loadingEl : history.error
    ? <ErrorState error={history.error} onRetry={history.refetch} />
    : <Text style={[styles.pad, { color: theme.muted, textAlign: 'center' }]}>No history yet</Text>;

  return (
    <Screen>
      <SampleBanner />
      <StaleBanner />
      <View style={{ width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', flex: 1 }}>
        <View style={[styles.segments, { borderColor: theme.border }]}>
          {tabs.map((t) => {
            const on = tab === t.key;
            return (
              <Pressable
                key={t.key}
                testID={`tab-${t.key}`}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setTab(t.key)}
                style={[styles.segment, on && { backgroundColor: theme.accent }]}
              >
                <Text style={{ color: on ? '#ffffff' : theme.text, fontWeight: '600' }}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {tab === 'queue' ? (
          <FlatList
            testID="queue-list"
            data={queueRecords}
            keyExtractor={(q) => String(q.id)}
            renderItem={({ item }) => <QueueRow item={item} onRemove={setPending} />}
            ListEmptyComponent={queueEmpty}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        ) : (
          <FlatList
            testID="history-list"
            data={historyRecords}
            keyExtractor={(h) => String(h.id)}
            renderItem={({ item }) => <HistoryRow item={item} now={now} />}
            ListEmptyComponent={historyEmpty}
            ListFooterComponent={history.isFetchingNextPage ? loadingEl : undefined}
            onEndReachedThreshold={0.5}
            onEndReached={() => {
              if (history.hasNextPage && !history.isFetchingNextPage) history.fetchNextPage();
            }}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </View>
      <ConfirmRemove
        request={pending}
        onClose={() => setPending(null)}
        onConfirm={(v) => {
          setPending(null);
          void remove.run(v);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  segments: { flexDirection: 'row', margin: 12, borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  row: { paddingHorizontal: 16, paddingVertical: 10, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 16, fontWeight: '600' },
  shrink: { flexShrink: 1 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: 8 },
  action: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 400, borderRadius: 14, padding: 20, gap: 16 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  pad: { padding: 24 },
  emptyWrap: { padding: 32, alignItems: 'center', gap: 12 },
  btn: { minHeight: 44, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
