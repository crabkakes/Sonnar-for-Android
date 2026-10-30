import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './theme';

/** Root container for a screen: keeps content below the status bar / notch. Bottom is left to the tab bar. */
export function Screen({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <SafeAreaView testID="screen" edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      {children}
    </SafeAreaView>
  );
}
