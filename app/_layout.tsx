import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { ConnectionProvider, useConnection } from '../src/connection/ConnectionProvider';
import { QueryProvider } from '../src/query/QueryProvider';
import { NoticeProvider } from '../src/ui/Notice';
import { ThemeProvider, useTheme } from '../src/ui/theme';

function Gate() {
  const { state, loading } = useConnection();
  const theme = useTheme();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  if (state.mode === 'none') return <Redirect href={'/server' as never} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <NoticeProvider>
        <ConnectionProvider>
          <QueryProvider>
            <Gate />
          </QueryProvider>
        </ConnectionProvider>
      </NoticeProvider>
    </ThemeProvider>
  );
}
