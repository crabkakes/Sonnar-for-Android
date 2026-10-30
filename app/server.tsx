import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { userMessage } from '../src/api/errors';
import { createLiveApi } from '../src/api/liveApi';
import { normalizeBaseUrl } from '../src/api/url';
import { useConnection } from '../src/connection/ConnectionProvider';
import { useTheme } from '../src/ui/theme';

type TestResult =
  | { status: 'ok'; version: string; tested: string }
  | { status: 'error'; title: string; detail: string; tested: string };

const stamp = (url: string, key: string) => `${url}\n${key}`;

export default function ServerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { state, setLive, setSample, disconnect } = useConnection();
  const live = state.mode === 'live';

  const [url, setUrl] = useState(state.mode === 'live' ? state.config.baseUrl : '');
  const [apiKey, setApiKey] = useState(state.mode === 'live' ? state.config.apiKey : '');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [saving, setSaving] = useState(false);

  const current = stamp(url.trim(), apiKey.trim());
  const shown = result && result.tested === current ? result : null;
  const canSave = shown?.status === 'ok' && !saving;
  const canTest = url.trim() !== '' && apiKey.trim() !== '' && !testing;

  async function runTest() {
    const tested = current;
    setTesting(true);
    try {
      const baseUrl = normalizeBaseUrl(url);
      const status = await createLiveApi({ baseUrl, apiKey: apiKey.trim() }).testConnection();
      setResult({ status: 'ok', version: status.version, tested });
    } catch (e) {
      setResult({ status: 'error', ...userMessage(e), tested });
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await setLive({ baseUrl: normalizeBaseUrl(url), apiKey: apiKey.trim() });
      router.replace('/');
    } catch (e) {
      setResult({ status: 'error', ...userMessage(e), tested: current });
    } finally {
      setSaving(false);
    }
  }

  async function explore() {
    await setSample();
    router.replace('/');
  }

  function confirmDisconnect() {
    Alert.alert('Disconnect?', 'This removes the saved server address and API key from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await disconnect();
          setUrl('');
          setApiKey('');
          setResult(null);
        },
      },
    ]);
  }

  const input = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          {live ? 'Server' : 'Connect to Sonarr'}
        </Text>

        <Text style={[styles.label, { color: theme.text }]}>Server address</Text>
        <TextInput
          accessibilityLabel="Server address"
          style={input}
          value={url}
          onChangeText={setUrl}
          placeholder="http://192.168.1.50:8989"
          placeholderTextColor={theme.muted}
          autoCorrect={false}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={[styles.label, { color: theme.text }]}>API key</Text>
        <TextInput
          accessibilityLabel="API key"
          style={input}
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry
          autoCorrect={false}
          autoCapitalize="none"
        />
        <Text style={[styles.helper, { color: theme.muted }]}>
          Find it in Sonarr → Settings → General → Security.
        </Text>

        {testing ? <ActivityIndicator color={theme.accent} style={styles.status} /> : null}
        {shown?.status === 'ok' ? (
          <Text accessibilityRole="alert" style={[styles.status, { color: theme.success }]}>
            Connected to Sonarr {shown.version}
          </Text>
        ) : null}
        {shown?.status === 'error' ? (
          <View accessibilityRole="alert" style={styles.status}>
            <Text style={[styles.errorTitle, { color: theme.danger }]}>{shown.title}</Text>
            <Text style={{ color: theme.muted }}>{shown.detail}</Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Test"
            accessibilityState={{ disabled: !canTest }}
            disabled={!canTest}
            onPress={runTest}
            style={[styles.button, styles.outline, { borderColor: theme.accent, opacity: canTest ? 1 : 0.5 }]}
          >
            <Text style={[styles.buttonText, { color: theme.accent }]}>Test</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save"
            accessibilityState={{ disabled: !canSave }}
            disabled={!canSave}
            onPress={save}
            style={[styles.button, { backgroundColor: theme.accent, opacity: canSave ? 1 : 0.5 }]}
          >
            <Text style={[styles.buttonText, { color: theme.bg }]}>Save</Text>
          </Pressable>
        </View>

        {!live ? (
          <Pressable accessibilityRole="button" onPress={explore} style={styles.link}>
            <Text style={[styles.buttonText, { color: theme.accent }]}>Explore with sample data</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={confirmDisconnect} style={styles.link}>
            <Text style={[styles.buttonText, { color: theme.danger }]}>Disconnect</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 64, gap: 8 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 16 },
  helper: { fontSize: 13 },
  status: { marginTop: 12, gap: 2 },
  errorTitle: { fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: { flex: 1, minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  outline: { borderWidth: 1 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  link: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
});
