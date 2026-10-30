import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTheme } from '../../src/ui/theme';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Shows', tabBarIcon: ({ color, size }) => <Ionicons name="tv-outline" color={color as string} size={size} /> }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color as string} size={size} /> }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: ({ color, size }) => <Ionicons name="download-outline" color={color as string} size={size} /> }} />
    </Tabs>
  );
}
