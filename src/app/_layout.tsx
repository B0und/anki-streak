import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TamaguiProvider, Text, Theme } from 'tamagui';

import { AchievementCelebration } from '../AchievementCelebration';
import { Onboarding, useOnboarding } from '../Onboarding';
import { ProgressProvider } from '../progressContext';
import { config } from '../../tamagui.config';
import { DashboardProvider, useDashboardContext } from '../dashboardContext';
import { copy } from '../messages';

export const unstable_settings = { initialRouteName: '(tabs)' };

function Navigation() {
  const { palette, mode, language, dashboard } = useDashboardContext();
  const onboarding = useOnboarding();
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;

  return <Theme name={`${mode}_${dashboard.themeId}`}>
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.background }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ThemeProvider value={{ ...base, colors: {
        ...base.colors, background: palette.background, card: palette.surface, primary: palette.accent,
        border: palette.line, text: palette.text, notification: palette.accent,
      } }}>
        <View style={{ flex: 1, display: onboarding.done ? 'flex' : 'none' }}
          importantForAccessibility={onboarding.done ? 'auto' : 'no-hide-descendants'}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </ThemeProvider>
      {onboarding.done ? <AchievementCelebration /> : <Onboarding flow={onboarding} />}
      {dashboard.notice && <Text pointerEvents="none" accessibilityLiveRegion="polite" p={10} text="center"
        position="absolute" b={82} l={16} r={16} rounded={10} color="color" bg="subtle">
        {copy(language, dashboard.notice)}
      </Text>}
    </SafeAreaView>
  </Theme>;
}

export default function RootLayout() {
  return <TamaguiProvider config={config} defaultTheme="light">
    <DashboardProvider><ProgressProvider><Navigation /></ProgressProvider></DashboardProvider>
  </TamaguiProvider>;
}
