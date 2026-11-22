import { useRouter } from 'expo-router';
import { Image, Text, XStack, YStack } from 'tamagui';

import { characterPalettes } from '../../../character-palettes';
import { useDashboardContext } from '../../../dashboardContext';
import { copy } from '../../../messages';
import { Screen } from '../../../Screen';
import { themeOrder, themes } from '../../../themes';

export default function ThemesRoute() {
  const { dashboard, language } = useDashboardContext();
  const router = useRouter();
  return <Screen title={copy(language, 'themes')} onBack={() => router.canGoBack() ? router.back() : router.replace('/widget')}>
    {themeOrder.map((id) => {
      const theme = themes[id];
      const selected = id === dashboard.themeId;
      return <XStack key={id} accessibilityRole="radio" accessibilityState={{ checked: selected }}
        onPress={() => void dashboard.selectTheme(id)}
        bg="surface" borderColor={selected ? 'accent' : 'border-color'} borderWidth={1.5} rounded={18}
        items="center" overflow="hidden" minH={127} opacity="press:0.8">
        <YStack bg={characterPalettes[id].widget.card} w="43%" h={126} p={5} overflow="hidden">
          <Image objectFit="contain" source={{ uri: theme[selected ? dashboard.mood : 'happy'] }}
            style={{ width: '100%', height: '100%' }} />
        </YStack>
        <YStack flex={1} self="stretch" pt={36} pb={8} px={12}>
          <Text color="color" fontFamily="display" fontWeight="700" fontSize={23}>{theme.name}</Text>
          <Text color="muted" mt={3}>{theme.source}</Text>
          {selected && <Text color="accent" mt={7} fontWeight="700">{copy(language, 'choose')}</Text>}
        </YStack>
      </XStack>;
    })}
  </Screen>;
}
