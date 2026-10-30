import { Text, View } from 'react-native';
import { Screen } from '../../src/ui/Screen';
import { useTheme } from '../../src/ui/theme';

export default function ActivityScreen() {
  const theme = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.muted }}>Activity is coming soon</Text>
      </View>
    </Screen>
  );
}
