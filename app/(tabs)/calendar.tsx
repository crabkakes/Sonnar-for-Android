import { Text, View } from 'react-native';
import { useTheme } from '../../src/ui/theme';

export default function CalendarScreen() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
      <Text style={{ color: theme.muted }}>Calendar is coming soon</Text>
    </View>
  );
}
