import { I18nProvider, useLingui } from '@lingui/react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TamaguiProvider, Text, Theme } from 'tamagui';

import { AchievementCelebration } from '../AchievementCelebration';
import { UpdatePrompt } from '../AppUpdates';
import { Onboarding, useOnboarding } from '../Onboarding';
import { ProgressProvider } from '../progressContext';
import { config } from '../../tamagui.config';
import { DashboardActorContext, useDashboard } from '../dashboardMachine';
import { getI18n } from '../i18n';
import { useAppAppearance } from '../useAppAppearance';
import { messages } from '../messages';
import { UpdatesActorContext } from '../updateMachine';

export const unstable_settings = { initialRouteName: '(tabs)' };

function Navigation() {
  const { _ } = useLingui();
  const dashboard = useDashboard();
  const { palette, mode } = useAppAppearance();
  const onboarding = useOnboarding();
  const showUpdatePrompt = UpdatesActorContext.useSelector(({ context }) => context.showPrompt);
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
      {!onboarding.done ? <Onboarding flow={onboarding} /> : showUpdatePrompt ? <UpdatePrompt /> : <AchievementCelebration />}
      {dashboard.notice && <Text pointerEvents="none" accessibilityLiveRegion="polite" p={10} text="center"
        position="absolute" b={82} l={16} r={16} rounded={10} color="color" bg="subtle">
        {_(messages[dashboard.notice])}
      </Text>}
    </SafeAreaView>
  </Theme>;
}

function LocalizedApp() {
  const language = DashboardActorContext.useSelector(({ context }) => context.language);
  return <I18nProvider i18n={getI18n(language)}>
    <ProgressProvider><Navigation /></ProgressProvider>
  </I18nProvider>;
}

export default function RootLayout() {
  return <TamaguiProvider config={config} defaultTheme="light">
    <DashboardActorContext.Provider>
      <UpdatesActorContext.Provider><LocalizedApp /></UpdatesActorContext.Provider>
    </DashboardActorContext.Provider>
  </TamaguiProvider>;
}
