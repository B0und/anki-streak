import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Download, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardProvider, useDashboardContext } from '../dashboardContext';
import { copy } from '../messages';

export const unstable_settings = { initialRouteName: '(tabs)' };

function Navigation() {
  const { palette, mode, language, updates, dashboard } = useDashboardContext();
  const router = useRouter();
  const [dismissed, setDismissed] = useState<string>();
  const update = updates.state.kind === 'available' ? updates.state.update : null;
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;

  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.background }}>
    <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    {update && update.digest !== dismissed &&
      <View style={[styles.banner, { backgroundColor: palette.subtle, borderColor: palette.line }]}>
        <Pressable accessibilityRole="button" style={styles.update} onPress={() => {
          setDismissed(update.digest);
          router.navigate({ pathname: '/settings', params: { update: update.tag } });
        }}>
          <Download color={palette.accent} size={20} />
          <View style={{ flex: 1 }}>
            <Text accessibilityLiveRegion="polite" style={{ color: palette.text, fontWeight: '700' }}>
              {copy(language, 'updateAvailable', { version: update.version })}
            </Text>
            <Text style={{ color: palette.accent, fontSize: 12 }}>{copy(language, 'viewUpdate')}</Text>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={copy(language, 'dismiss')}
          style={styles.dismiss} onPress={() => setDismissed(update.digest)}>
          <X color={palette.muted} size={19} />
        </Pressable>
      </View>}
    <ThemeProvider value={{ ...base, colors: {
      ...base.colors, background: palette.background, card: palette.surface, primary: palette.accent,
      border: palette.line, text: palette.text, notification: palette.accent,
    } }}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
    {dashboard.notice && <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: palette.text, backgroundColor: palette.subtle }]}>
      {copy(language, dashboard.notice)}
    </Text>}
  </SafeAreaView>;
}

export default function RootLayout() {
  return <DashboardProvider><Navigation /></DashboardProvider>;
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: 16, marginBottom: 6, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  update: { flex: 1, minHeight: 50, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dismiss: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  notice: { padding: 10, textAlign: 'center', position: 'absolute', bottom: 82, left: 16, right: 16, borderRadius: 10 },
});
