import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SonarrError } from '../api/errors';
import { useConnection } from '../connection/ConnectionProvider';
import { useTheme } from './theme';

function Banner({ text, color }: { text: string; color: string }) {
  const theme = useTheme();
  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: theme.surface, borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
}

export function SampleBanner() {
  const { state } = useConnection();
  const theme = useTheme();
  if (state.mode !== 'sample') return null;
  return <Banner text="Sample data — not connected to a server" color={theme.warning} />;
}

/** Visible while any query holds data but its latest fetch failed to reach Sonarr. */
export function StaleBanner() {
  const client = useQueryClient();
  const theme = useTheme();
  const stale = useSyncExternalStore(
    (notify) => client.getQueryCache().subscribe(notify),
    () =>
      client.getQueryCache().getAll().some((q) => {
        const e = q.state.error;
        return q.state.data !== undefined && e instanceof SonarrError && (e.kind === 'unreachable' || e.kind === 'timeout');
      }),
  );
  if (!stale) return null;
  return <Banner text="Can't reach Sonarr — showing saved data" color={theme.danger} />;
}

const styles = StyleSheet.create({
  banner: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderBottomWidth: 2 },
  text: { fontSize: 14, fontWeight: '600' },
});
