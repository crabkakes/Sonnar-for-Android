import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useConnection } from '../connection/ConnectionProvider';
import { useTheme } from './theme';

const SIZES = { small: { width: 56, height: 84 }, large: { width: 120, height: 180 } } as const;
const PALETTE = ['#5b7db1', '#a05a8c', '#4f9a7b', '#b5794a', '#7a6bb0', '#a85a5a', '#4a8fa8', '#8a9a4a'];

function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  return (words.slice(0, 2).map((w) => Array.from(w)[0]).join('') || '?').toUpperCase();
}

export function Poster({ seriesId, size, title }: { seriesId: number; size: 'small' | 'large'; title: string }) {
  const { api } = useConnection();
  const theme = useTheme();
  const [failedId, setFailedId] = useState<number | null>(null);
  const failed = failedId === seriesId;

  const source = useMemo(() => {
    try {
      return api?.posterSource(seriesId) ?? null;
    } catch {
      return null;
    }
  }, [api, seriesId]);

  const dims = SIZES[size];
  if (source && !failed) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        source={source}
        style={[dims, styles.box, { backgroundColor: theme.border }]}
        contentFit="cover"
        onError={() => setFailedId(seriesId)}
      />
    );
  }
  const color = PALETTE[Math.abs(seriesId) % PALETTE.length];
  return (
    <View style={[dims, styles.box, styles.center, { backgroundColor: color }]}>
      <Text style={[styles.initials, { fontSize: size === 'small' ? 18 : 36 }]}>{initials(title)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 6 },
  center: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#ffffff', fontWeight: '700' },
});
