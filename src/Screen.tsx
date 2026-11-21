import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ScrollView, Text, View, XStack } from 'tamagui';

import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import { screenInset, screenMaxWidth } from './screenLayout';

export function Screen({ title, children, onBack }: { title: string; children: ReactNode; onBack?: () => void }) {
  const { palette, language } = useDashboardContext();
  return <>
    <XStack w="100%" maxW={screenMaxWidth} self="center" px={screenInset} py={10} minH={62} items="center" gap={8}>
      {onBack && <View accessibilityRole="button" accessibilityLabel={copy(language, 'back')}
        onPress={onBack} w={48} h={48} ml={-10} pl={7} justify="center" opacity="press:0.75">
        <ArrowLeft size={22} color={palette.accent} />
      </View>}
      <Text accessibilityRole="header" flex={1} color="color" fontFamily="display" fontWeight="700" fontSize={28}>{title}</Text>
    </XStack>
    <ScrollView flex={1} w="100%" maxW={screenMaxWidth} self="center"
      contentContainerStyle={{ paddingHorizontal: screenInset, paddingBottom: 22, gap: 14 }} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  </>;
}
