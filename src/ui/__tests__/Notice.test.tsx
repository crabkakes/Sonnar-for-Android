import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NoticeProvider, TAB_BAR_HEIGHT, useNotice } from '../Notice';
import { ThemeProvider } from '../theme';

function Trigger() {
  const notice = useNotice();
  return (
    <Pressable accessibilityRole="button" onPress={() => notice.show('Show added')}>
      <Text>go</Text>
    </Pressable>
  );
}

const metrics = (bottom: number) => ({
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom },
});

test('toast sits above the tab bar and inside the bottom safe area', async () => {
  await render(
    <SafeAreaProvider initialMetrics={metrics(34)}>
      <ThemeProvider>
        <NoticeProvider>
          <Trigger />
        </NoticeProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  await fireEvent.press(screen.getByText('go'));
  expect(screen.getByText('Show added')).toBeTruthy();
  const { bottom } = StyleSheet.flatten(screen.getByTestId('notice').props.style);
  expect(bottom).toBeGreaterThanOrEqual(34 + TAB_BAR_HEIGHT);
  expect(bottom).toBe(34 + TAB_BAR_HEIGHT + 16);
});
