import { Host, Slider } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { getWidgetTheme, getWidgetBackgroundTransparency, openAnki, pinWidget, requestPermission, type AnkiActivity } from './activity';
import { changeWidgetTheme, changeWidgetBackgroundTransparency, enableBackgroundRefresh, refreshWidget } from './widgetRefresh';

import { themes, themeOrder, type WidgetTheme } from './themes';

type PreviewMood = 'waiting' | 'happy';

function Dashboard() {
  const [activity, setActivity] = useState<AnkiActivity | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [preview, setPreview] = useState<PreviewMood>();
  const [notice, setNotice] = useState('');
  const [transparency, setTransparency] = useState(getWidgetBackgroundTransparency);
  const [themeId, setThemeId] = useState(getWidgetTheme);
  const theme = themes[themeId];

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await refreshWidget();
      setActivity(next);
      if (next.kind === 'ready') {
        await enableBackgroundRefresh();
      }
    } catch {
      setNotice('Couldn’t refresh the widget. Try again.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });
    return () => listener.remove();
  }, [refresh]);

  useEffect(() => {
    if (transparency === getWidgetBackgroundTransparency()) return;
    const pending = setTimeout(() => changeWidgetBackgroundTransparency(transparency), 150);
    return () => clearTimeout(pending);
  }, [transparency]);

  const ready = activity?.kind === 'ready';
  const mood = preview ?? (ready && activity.today > 0 ? 'happy' : 'waiting');
  const message = {
    permission: 'Allow access to read your review activity from AnkiDroid.',
    missing: 'Install AnkiDroid to link your review activity.',
    unsupported: 'Update AnkiDroid to a version that supports card searches.',
    unavailable: 'Open AnkiDroid to load your collection, then try refreshing.',
  };

  async function selectTheme(id: WidgetTheme) {
    if (id === themeId) return;
    setNotice('');
    try {
      const update = changeWidgetTheme(id);
      setThemeId(id);
      setActivity(await update);
    } catch {
      setThemeId(getWidgetTheme());
      setNotice('Couldn’t update the widget theme. Try refreshing.');
    }
  }

  async function connect() {
    setNotice('');
    try {
      await requestPermission();
      await refresh();
    } catch {
      setNotice('Couldn’t open the permission prompt. Check the app’s Android permissions.');
    }
  }

  async function addWidget() {
    setNotice('');
    try {
      if (await pinWidget()) return;
    } catch {
      // Launchers without pin support can still offer the widget through their picker.
    }
    setNotice('Touch and hold your home screen, then choose Widgets → Anki Streak.');
  }

  async function launchAnki() {
    setNotice('');
    try {
      if (await openAnki()) return;
    } catch {
      setNotice('Couldn’t open AnkiDroid.');
      return;
    }
    setNotice('Install AnkiDroid to open your collection.');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Anki Streak</Text>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardBody}>
            <Text style={[styles.label, { color: theme.accent }]}>TODAY</Text>
            <Text style={styles.stat}>{ready ? activity.today : '—'}</Text>
            <Text style={styles.caption}>cards reviewed</Text>
            <Text style={[styles.streak, { color: theme.accent }]}>
              {ready ? `${activity.streak} ${activity.streak === 1 ? 'day' : 'days'} in a row` : 'Review streak'}
            </Text>
          </View>
          <Image
            source={theme[mood]}
            accessibilityLabel={`${theme.name} is ${mood === 'happy' ? 'cheering' : 'waiting'}`}
            resizeMode="contain"
            style={styles.portrait}
          />
        </View>
        <View style={styles.themes}>
          <Text style={styles.caption}>Theme</Text>
          <View style={styles.themeOptions}>
            {themeOrder.map((id) => {
              const option = themes[id];
              const selected = id === themeId;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => void selectTheme(id)}
                  style={[styles.themeButton, selected && { borderColor: option.accent, backgroundColor: option.card }]}
                >
                  <View style={[styles.themeSwatch, { backgroundColor: option.accent }]} />
                  <Text style={styles.moodText}>{option.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.moods}>
          <Text style={styles.caption}>Preview moods</Text>
          <View style={styles.moodOptions}>
            {(['waiting', 'happy'] satisfies PreviewMood[]).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: preview === option }}
                onPress={() => setPreview((current) => current === option ? undefined : option)}
                style={[styles.moodButton, preview === option && styles.moodSelected]}
              >
                <Text style={styles.moodText}>{option === 'waiting' ? 'Waiting' : 'Happy'}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {ready && (
          <Text style={styles.caption}>
            30-day averages · {activity.dailyReviewed} reviewed · {activity.dailyLearned} new cards learned
          </Text>
        )}

        {activity && activity.kind !== 'ready' && (
          <View style={styles.connection}>
            <Text style={styles.connectionText}>{message[activity.kind]}</Text>
            {activity.kind === 'permission' && (
              <>
                <Pressable accessibilityRole="button" style={styles.primary} onPress={() => void connect()}>
                  <Text style={styles.primaryText}>Connect AnkiDroid</Text>
                </Pressable>
                <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => void Linking.openSettings()}>
                  <Text style={styles.secondaryText}>Android permissions</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        <View style={styles.transparency}>
          <View style={styles.transparencyHeader}>
            <Text style={styles.secondaryText}>Background transparency</Text>
            <Text style={styles.transparencyValue}>{transparency}%</Text>
          </View>
          <Host matchContents={{ vertical: true }} style={styles.slider}>
            <Slider
              value={transparency}
              min={0}
              max={100}
              colors={{
                activeTrackColor: theme.accent,
                inactiveTrackColor: '#25494D',
                thumbColor: theme.accent,
              }}
              modifiers={[fillMaxWidth(), semantics({ contentDescription: 'Background transparency' })]}
              onValueChange={(value) => setTransparency(Math.round(value))}
            />
          </Host>
        </View>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" style={styles.primary} onPress={() => void addWidget()}>
            <Text style={styles.primaryText}>Add home screen widget</Text>
          </Pressable>
          <View style={styles.secondaryActions}>
            {activity?.kind !== 'missing' && (
              <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => void launchAnki()}>
                <Text style={styles.secondaryText}>Open AnkiDroid</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={refreshing}
              onPress={() => { setNotice(''); void refresh(); }}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>{refreshing ? 'Refreshing…' : 'Refresh'}</Text>
            </Pressable>
          </View>
          {notice !== '' && <Text accessibilityLiveRegion="polite" style={styles.caption}>{notice}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><Dashboard /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09171D' },
  content: { paddingHorizontal: 22, paddingTop: 26, paddingBottom: 32, gap: 15 },
  title: { color: '#F2FEFC', fontSize: 32, fontWeight: '800', letterSpacing: -1.1 },
  card: {
    minHeight: 170, borderRadius: 24, borderWidth: 1, borderColor: '#25494D',
    overflow: 'hidden', backgroundColor: '#11282E',
  },
  cardBody: { padding: 20, alignSelf: 'flex-start', zIndex: 1 },
  label: { color: '#72F5DD', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  stat: { color: '#F2FEFC', fontSize: 46, fontWeight: '800', lineHeight: 54 },
  caption: { color: '#A4BFC1', fontSize: 14 },
  streak: { marginTop: 11, color: '#72F5DD', fontSize: 14, fontWeight: '700' },
  portrait: { position: 'absolute', bottom: -1, right: -6, width: '58%', height: '100%' },
  themes: { gap: 8 },
  themeOptions: { flexDirection: 'row', gap: 7 },
  themeButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    minHeight: 44, paddingHorizontal: 7, borderRadius: 12, borderWidth: 1,
    borderColor: '#25494D', backgroundColor: '#0D1E24',
  },
  themeSwatch: { width: 9, height: 9, borderRadius: 5 },
  moods: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  moodOptions: { flexDirection: 'row', gap: 6 },
  moodButton: {
    minHeight: 44, paddingHorizontal: 13, justifyContent: 'center',
    borderRadius: 99, borderWidth: 1, borderColor: '#25494D',
  },
  moodSelected: { borderColor: '#72F5DD', backgroundColor: '#1C3A40' },
  moodText: { color: '#D8F1EF', fontSize: 13, fontWeight: '600' },
  connection: {
    padding: 14, gap: 9, borderRadius: 17, borderWidth: 1,
    borderColor: '#25494D', backgroundColor: '#0D1E24',
  },
  connectionText: { color: '#D8F1EF', fontSize: 14, lineHeight: 20 },
  transparency: {
    paddingHorizontal: 14, paddingTop: 12, borderRadius: 17, borderWidth: 1,
    borderColor: '#25494D', backgroundColor: '#0D1E24',
  },
  transparencyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  transparencyValue: { color: '#72F5DD', fontSize: 14, fontVariant: ['tabular-nums'] },
  slider: { width: '100%' },
  actions: { gap: 8 },
  primary: {
    minHeight: 49, borderRadius: 13, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#72F5DD',
  },
  primaryText: { color: '#0D2528', fontSize: 15, fontWeight: '800' },
  secondaryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondary: {
    flexGrow: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
    backgroundColor: '#142C33', borderRadius: 12,
  },
  secondaryText: { color: '#D8F1EF', fontSize: 14, fontWeight: '700' },
});
