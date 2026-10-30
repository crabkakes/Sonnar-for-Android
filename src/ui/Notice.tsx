import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTheme } from './theme';

const NOTICE_MS = 3500;
/** Tallest default bottom tab bar (Android); keeps the toast clear of it on every platform. */
export const TAB_BAR_HEIGHT = 56;
const GAP = 16;

type NoticeApi = { show(text: string): void };
const NoticeContext = createContext<NoticeApi>({ show: () => {} });

export function NoticeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [text, setText] = useState<string | null>(null);
  // Read the context directly so a missing provider (e.g. in tests) means zero insets, not a throw.
  const insets = useContext(SafeAreaInsetsContext);
  const bottom = (insets?.bottom ?? 0) + TAB_BAR_HEIGHT + GAP;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((t: string) => {
    clearTimeout(timer.current);
    setText(t);
    timer.current = setTimeout(() => setText(null), NOTICE_MS);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const api = useMemo(() => ({ show }), [show]);

  return (
    <NoticeContext.Provider value={api}>
      {children}
      {text !== null && (
        <View testID="notice" pointerEvents="none" style={[styles.wrap, { bottom }]}>
          <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.toast, { backgroundColor: theme.text }]}>
            <Text style={[styles.text, { color: theme.bg }]}>{text}</Text>
          </View>
        </View>
      )}
    </NoticeContext.Provider>
  );
}

export const useNotice = (): NoticeApi => useContext(NoticeContext);

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  text: { fontSize: 15 },
});
