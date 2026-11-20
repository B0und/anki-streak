import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TamaguiProvider, Text, Theme } from 'tamagui';

import { config } from '../../tamagui.config';
import { DashboardProvider, useDashboardContext } from '../dashboardContext';
import { copy } from '../messages';

export const unstable_settings = { initialRouteName: '(tabs)' };

function Navigation() {
  const { palette, mode, language, dashboard } = useDashboardContext();
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;

  return <Theme name={`${mode}_${dashboard.themeId}`}>
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.background }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ThemeProvider value={{ ...base, colors: {
        ...base.colors, background: palette.background, card: palette.surface, primary: palette.accent,
        border: palette.line, text: palette.text, notification: palette.accent,
      } }}>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
      {dashboard.notice && <Text pointerEvents="none" accessibilityLiveRegion="polite" p={10} text="center"
        position="absolute" b={82} l={16} r={16} rounded={10} color="color" bg="subtle">
        {copy(language, dashboard.notice)}
      </Text>}
    </SafeAreaView>
  </Theme>;
}

export default function RootLayout() {
  return <TamaguiProvider config={config} defaultTheme="light">
    <DashboardProvider><Navigation /></DashboardProvider>
  </TamaguiProvider>;
}
