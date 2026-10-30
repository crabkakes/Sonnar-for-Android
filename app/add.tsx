import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { userMessage } from '../src/api/errors';
import type { LookupSeries, MonitorOption, SeriesType } from '../src/api/types';
import { connectionIdentity, useConnection } from '../src/connection/ConnectionProvider';
import { loadAddDefaults, resolveAddDefaults, saveAddDefaults, type AddDefaults } from '../src/domain/addDefaults';
import { useSonarrMutation, useSonarrQuery } from '../src/query/hooks';
import { SampleBanner, StaleBanner } from '../src/ui/Banners';
import { Screen } from '../src/ui/Screen';
import { useTheme } from '../src/ui/theme';
import { useLayout } from '../src/ui/useLayout';

const MONITORS: [MonitorOption, string][] = [
  ['all', 'All'], ['future', 'Future'], ['missing', 'Missing'], ['existing', 'Existing'], ['pilot', 'Pilot'], ['firstSeason', 'First season'], ['none', 'None'],
];
const TYPES: [SeriesType, string][] = [['standard', 'Standard'], ['daily', 'Daily'], ['anime', 'Anime']];

function Chips<T extends string>({ items, value, onChange }: { items: [T, string][]; value: T; onChange(v: T): void }) {
  const theme = useTheme();
  return (
    <View style={styles.chips}>
      {items.map(([v, label]) => {
        const selected = v === value;
        return (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onChange(v)}
            style={[styles.chip, { borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.accent : theme.surface }]}
          >
            <Text style={{ color: selected ? '#ffffff' : theme.text }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PickerRow({ label, value, options, onPick }: { label: string; value: string; options: { key: string; label: string }[]; onPick(key: string): void }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen(true)} style={[styles.pickerRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Text style={{ color: theme.text, fontSize: 16, flex: 1 }}>{value}</Text>
        <Ionicons name="chevron-down" size={18} color={theme.muted} />
      </Pressable>
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel={`Close ${label} list`} />
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
          {options.map((o) => (
            <Pressable
              key={o.key}
              accessibilityRole="button"
              accessibilityLabel={o.label}
              onPress={() => {
                setOpen(false);
                onPick(o.key);
              }}
              style={styles.sheetBtn}
            >
              <Text style={{ color: theme.text, fontSize: 16 }}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  );
}

export default function AddScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { maxContentWidth } = useLayout();
  const { state } = useConnection();
  const identity = connectionIdentity(state);

  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(text.trim()), 400);
    return () => clearTimeout(t);
  }, [text]);

  const lookupQ = useSonarrQuery(['lookup', term], (api) => api.lookupSeries(term), { enabled: term.length > 0 });
  const foldersQ = useSonarrQuery(['rootFolders'], (api) => api.getRootFolders());
  const profilesQ = useSonarrQuery(['qualityProfiles'], (api) => api.getQualityProfiles());

  const [chosen, setChosen] = useState<LookupSeries | null>(null);
  const [saved, setSaved] = useState<Partial<AddDefaults>>({});
  const [edits, setEdits] = useState<Partial<AddDefaults>>({});
  useEffect(() => {
    let alive = true;
    void loadAddDefaults(identity).then((d) => alive && setSaved(d));
    return () => {
      alive = false;
    };
  }, [identity]);

  const folders = foldersQ.data ?? [];
  const profiles = profilesQ.data ?? [];
  const opts = resolveAddDefaults({ ...saved, ...edits }, folders, profiles);
  const set = <K extends keyof AddDefaults>(k: K, v: AddDefaults[K]) => setEdits((e) => ({ ...e, [k]: v }));

  const newId = useRef<number | null>(null);
  const add = useSonarrMutation(
    async (api, v: { lookup: LookupSeries; opts: AddDefaults }) => {
      const created = await api.addSeries({ lookup: v.lookup, ...v.opts });
      newId.current = created.id;
      await saveAddDefaults(identity, v.opts);
    },
    { successMessage: 'Show added', invalidate: [['series']] },
  );

  async function submit() {
    if (!chosen) return;
    newId.current = null;
    await add.run({ lookup: chosen, opts });
    if (newId.current !== null) router.replace(`/series/${newId.current}`);
  }

  const noFolders = foldersQ.data !== undefined && folders.length === 0;
  const canAdd = !!chosen && !noFolders && profiles.length > 0 && !add.isRunning;
  const addLabel = opts.searchForMissingEpisodes ? 'Add & search' : 'Add';

  function renderResult({ item }: { item: LookupSeries }) {
    const inLibrary = item.id !== undefined;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.title}
        onPress={() => (inLibrary ? router.push(`/series/${item.id}`) : setChosen(item))}
        style={[styles.result, { borderColor: theme.border }]}
      >
        {item.remotePoster ? (
          <Image accessibilityIgnoresInvertColors source={{ uri: item.remotePoster }} style={[styles.poster, { backgroundColor: theme.border }]} contentFit="cover" />
        ) : (
          <View style={[styles.poster, { backgroundColor: theme.border }]} />
        )}
        <View style={styles.resultBody}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{item.title}</Text>
          <Text style={{ color: theme.muted }}>{[item.year, item.network].filter(Boolean).join(' · ')}</Text>
          {inLibrary && <Text style={{ color: theme.success, fontWeight: '600' }}>In library</Text>}
        </View>
      </Pressable>
    );
  }

  const err = lookupQ.error ? userMessage(lookupQ.error) : null;

  return (
    <Screen>
      <SampleBanner />
      <StaleBanner />
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (chosen ? setChosen(null) : router.back())} style={styles.icon}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </Pressable>
        {!chosen && (
          <TextInput
            placeholder="Search for a show"
            placeholderTextColor={theme.muted}
            value={text}
            onChangeText={setText}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            style={[styles.search, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
          />
        )}
      </View>
      {chosen ? (
        <ScrollView style={{ width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' }} contentContainerStyle={styles.form}>
          <Text style={[styles.title, { color: theme.text }]}>{chosen.title}</Text>
          <Text style={{ color: theme.muted }}>{[chosen.year, chosen.network].filter(Boolean).join(' · ')}</Text>
          {noFolders && <Text style={{ color: theme.danger, fontWeight: '600' }}>Add a root folder in Sonarr first</Text>}
          <PickerRow label="Folder" value={opts.rootFolderPath} options={folders.map((f) => ({ key: f.path, label: f.path }))} onPick={(k) => set('rootFolderPath', k)} />
          <PickerRow
            label="Quality"
            value={profiles.find((p) => p.id === opts.qualityProfileId)?.name ?? ''}
            options={profiles.map((p) => ({ key: String(p.id), label: p.name }))}
            onPick={(k) => set('qualityProfileId', Number(k))}
          />
          <Text style={[styles.label, { color: theme.muted }]}>Monitor</Text>
          <Chips items={MONITORS} value={opts.monitor} onChange={(v) => set('monitor', v)} />
          <Text style={[styles.label, { color: theme.muted }]}>Series type</Text>
          <Chips items={TYPES} value={opts.seriesType} onChange={(v) => set('seriesType', v)} />
          <View style={styles.switchRow}>
            <Text style={{ color: theme.text, flex: 1 }}>Search for missing episodes</Text>
            <Switch accessibilityLabel="Search for missing episodes" value={opts.searchForMissingEpisodes} onValueChange={(v) => set('searchForMissingEpisodes', v)} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={addLabel}
            accessibilityState={{ disabled: !canAdd }}
            disabled={!canAdd}
            onPress={() => void submit()}
            style={[styles.primary, { backgroundColor: theme.accent, opacity: canAdd ? 1 : 0.5 }]}
          >
            {add.isRunning ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryText}>{addLabel}</Text>}
          </Pressable>
        </ScrollView>
      ) : (
        <FlatList
          style={{ width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' }}
          data={term ? lookupQ.data ?? [] : []}
          keyExtractor={(r) => String(r.tvdbId)}
          renderItem={renderResult}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            lookupQ.isLoading ? (
              <ActivityIndicator color={theme.accent} style={styles.pad} />
            ) : err ? (
              <View style={styles.pad}>
                <Text style={[styles.title, { color: theme.text }]}>{err.title}</Text>
                <Text style={{ color: theme.muted }}>{err.detail}</Text>
              </View>
            ) : term && lookupQ.data ? (
              <Text style={[styles.pad, { color: theme.muted }]}>No shows found</Text>
            ) : undefined
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  search: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 16 },
  result: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth },
  poster: { width: 56, height: 84, borderRadius: 6 },
  resultBody: { flex: 1, gap: 2 },
  form: { padding: 16, gap: 8, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderWidth: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, marginTop: 8 },
  primary: { minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  pad: { padding: 24, gap: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { padding: 16, paddingBottom: 32, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetBtn: { minHeight: 48, justifyContent: 'center' },
});
