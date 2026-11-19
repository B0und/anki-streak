import { useEffect, useState } from 'react';
import {
  AppState, BackHandler, Image, Linking, Pressable, ScrollView, StatusBar, StyleSheet, Text, View, useColorScheme,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppUpdates } from './AppUpdates';
import { palettes, type Palette } from './appearance';
import { celebrationDay } from './celebration';
import { copy, type Language } from './messages';
import { appearanceOptions, getLanguage, getWidgetLayout, languageOptions, preference, settings } from './preferences';
import { SettingsScreen } from './SettingsScreen';
import { Choices, Section } from './studyComponents';
import { themeOrder, themes } from './themes';
import { TodayScreen } from './TodayScreen';
import { useDashboard } from './useDashboard';
import { WidgetScreen } from './WidgetScreen';
import { refreshWidget, republishWidgetAppearance } from './widgetRefresh';

const routes = ['today', 'themes', 'widget', 'settings'] as const;
type Route = (typeof routes)[number];
const icons = { today: '⌂', themes: '◇', widget: '▦', settings: '⚙' };
const portraitMoods = ['live', 'waiting', 'happy'] as const;
const sources = { miku: 'Vocaloid', '2b': 'NieR:Automata', emilia: 'Re:Zero' };

function ThemeList({ dashboard, palette, language }: {
  dashboard: ReturnType<typeof useDashboard>; palette: Palette; language: Language;
}) {
  return <>
    <Text style={{ color: palette.muted, fontSize: 14 }}>{copy(language, 'themeHeading')}</Text>
    {themeOrder.map((id) => {
      const theme = themes[id];
      const selected = id === dashboard.themeId;
      return <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: selected }}
        onPress={() => void dashboard.selectTheme(id)}
        style={[styles.themeCard, { backgroundColor: palette.surface, borderColor: selected ? palette.accent : palette.line }]}>
        <View style={[styles.themeArt, { backgroundColor: theme.card }]}>
          <Image resizeMode="contain" source={theme[selected ? dashboard.mood : 'happy']}
            style={{ width: '100%', height: '100%' }} />
        </View>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={{ color: palette.text, fontFamily: 'serif', fontWeight: 'bold', fontSize: 23 }}>{theme.name}</Text>
          <Text style={{ color: palette.muted, marginTop: 3 }}>{sources[id]}</Text>
          {selected && <Text style={{ color: palette.accent, marginTop: 7, fontWeight: '700' }}>✓ {copy(language, 'choose')}</Text>}
        </View>
      </Pressable>;
    })}
    <Section palette={palette} title={copy(language, 'themePreview')}>
      <Choices<(typeof portraitMoods)[number]> palette={palette} choices={portraitMoods}
        value={dashboard.preview.kind === 'live' ? 'live' : dashboard.preview.mood}
        onChange={(mood) => {
          if (mood === 'live') dashboard.clearPreview();
          else if (dashboard.preview.kind !== 'preview' || dashboard.preview.mood !== mood) dashboard.togglePreview(mood);
        }}
        label={(mood) => copy(language, mood === 'live' ? mood : mood === 'happy' ? 'happyMood' : 'waitingMood')} />
    </Section>
  </>;
}

function Dashboard() {
  const dashboard = useDashboard();
  const [route, setRoute] = useState<Route>('today');
  const [appearance, setAppearance] = useState(() => preference('appearance', appearanceOptions, 'system'));
  const [languagePreference, setLanguagePreference] = useState(() => preference('language', languageOptions, 'system'));
  const [language, updateLanguage] = useState(getLanguage);
  const [layout, setLayout] = useState(getWidgetLayout);
  const [celebration, setCelebration] = useState(0);
  const systemAppearance = useColorScheme();
  const mode = appearance === 'system' ? systemAppearance ?? 'light' : appearance;
  const palette = palettes[mode];
  const ready = dashboard.activity?.kind === 'ready' ? dashboard.activity : null;

  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') updateLanguage(getLanguage());
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    const listener = Linking.addEventListener('url', ({ url }) => {
      if (url === 'ankistreak://celebration') setRoute('today');
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route === 'today') return false;
      setRoute('today');
      return true;
    });
    return () => back.remove();
  }, [route]);

  useEffect(() => {
    if (route === 'today' && ready?.today && settings.takeCelebration(celebrationDay()) &&
      settings.getPreference('animate') !== 'off') {
      setCelebration((token) => token + 1);
    }
  }, [ready, route]);

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(0), 3200);
    return () => clearTimeout(timer);
  }, [celebration]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>
          {route === 'today' ? 'Anki Streak' : copy(language, route)}
        </Text>
      </View>
      <ScrollView key={route} style={{ flex: 1, display: route === 'settings' ? 'none' : 'flex' }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {route === 'today' && <TodayScreen dashboard={dashboard} palette={palette} language={language} celebration={celebration} />}
        {route === 'themes' && <ThemeList dashboard={dashboard} palette={palette} language={language} />}
        {route === 'widget' && <WidgetScreen dashboard={dashboard} palette={palette} language={language}
          openThemes={() => setRoute('themes')} layout={layout} setLayout={(value) => {
            setLayout(value);
            settings.setPreference('layout', value);
            republishWidgetAppearance();
          }} />}
      </ScrollView>
      <ScrollView style={{ flex: 1, display: route === 'settings' ? 'flex' : 'none' }}
        contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {route === 'settings' && <SettingsScreen dashboard={dashboard} palette={palette} language={language}
          appearance={appearance} setAppearance={(value) => {
            settings.setPreference('appearance', value);
            setAppearance(value);
          }}
          languagePreference={languagePreference} setLanguage={(value) => {
            settings.setPreference('language', value);
            setLanguagePreference(value);
            updateLanguage(getLanguage());
            republishWidgetAppearance();
            void refreshWidget().catch(() => {});
          }} />}
        <AppUpdates palette={palette} language={language} visible={route === 'settings'} />
      </ScrollView>
      {dashboard.notice && <Text accessibilityLiveRegion="polite" style={{ color: palette.accent }}>{copy(language, dashboard.notice)}</Text>}
      <View style={[styles.nav, { borderTopColor: palette.line, backgroundColor: palette.surface }]}>
        {routes.map((key) => (
          <Pressable key={key} onPress={() => setRoute(key)} accessibilityRole="tab"
            accessibilityState={{ selected: route === key }}
            style={[styles.tab, route === key && { backgroundColor: palette.subtle }]}>
            <Text accessible={false} style={{ color: route === key ? palette.accent : palette.muted, fontSize: 21, lineHeight: 23 }}>{icons[key]}</Text>
            <Text style={{ color: route === key ? palette.accent : palette.muted, fontWeight: route === key ? '700' : '500',
              fontSize: 11, textAlign: 'center' }}>{copy(language, key)}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><Dashboard /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingTop: 9, paddingBottom: 9 },
  heading: { fontFamily: 'serif', fontWeight: 'bold', fontSize: 30 },
  content: { paddingHorizontal: 16, paddingBottom: 18, gap: 12 },
  themeCard: { borderRadius: 18, borderWidth: 1.5, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', minHeight: 127 },
  themeArt: { width: '43%', height: 126, overflow: 'hidden' },
  nav: { flexDirection: 'row', borderTopWidth: 1, paddingHorizontal: 8, paddingVertical: 6, gap: 4 },
  tab: { flex: 1, minHeight: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 13, paddingHorizontal: 2, gap: 1 },
});
