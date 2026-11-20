import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Download, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TamaguiProvider, Text, Theme, View, XStack, YStack } from 'tamagui';

import { config } from '../../tamagui.config';
import { DashboardProvider, useDashboardContext } from '../dashboardContext';
import { copy } from '../messages';

export const unstable_settings = { initialRouteName: '(tabs)' };

function Navigation() {
  const { palette, mode, language, updates, dashboard } = useDashboardContext();
  const router = useRouter();
  const update = updates.kind === 'available' ? updates.update : null;
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;

  return <Theme name={`${mode}_${dashboard.themeId}`}>
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.background }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {update && update.digest !== updates.dismissed &&
        <XStack mx={16} mb={6} borderWidth={1} rounded={12} items="center" bg="subtle" borderColor="border-color">
          <XStack accessibilityRole="button" flex={1} minH={50} px={12} items="center" gap={10}
            opacity="press:0.75" onPress={() => {
              updates.dismiss(update.digest);
              router.navigate({ pathname: '/settings', params: { update: update.tag } });
            }}>
            <Download color={palette.accent} size={20} />
            <YStack flex={1}>
              <Text accessibilityLiveRegion="polite" color="color" fontWeight="700">
                {copy(language, 'updateAvailable', { version: update.version })}
              </Text>
              <Text color="accent" fontSize={12}>{copy(language, 'viewUpdate')}</Text>
            </YStack>
          </XStack>
          <View accessibilityRole="button" accessibilityLabel={copy(language, 'dismiss')}
            w={44} minH={44} items="center" justify="center" opacity="press:0.75" onPress={() => updates.dismiss(update.digest)}>
            <X color={palette.muted} size={19} />
          </View>
        </XStack>}
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
