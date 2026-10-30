import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from './theme';

const NOTICE_MS = 3500;

type NoticeApi = { show(text: string): void };
const NoticeContext = createContext<NoticeApi>({ show: () => {} });

export function NoticeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [text, setText] = useState<string | null>(null);
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
        <View pointerEvents="none" style={styles.wrap}>
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
  wrap: { position: 'absolute', left: 16, right: 16, bottom: 32, alignItems: 'center' },
  toast: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  text: { fontSize: 15 },
});
