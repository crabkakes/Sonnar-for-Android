import { Stack } from 'expo-router';
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
  // Always render the navigator: child routes (including /server) only mount through it.
  // Connected routes are guarded, so with no connection the Stack falls back to /server.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={state.mode !== 'none'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="series/[id]" />
        <Stack.Screen name="add" />
        <Stack.Screen name="releases" />
      </Stack.Protected>
      <Stack.Screen name="server" />
    </Stack>
  );
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
