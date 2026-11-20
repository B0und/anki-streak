import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ScrollView, Text, View, XStack } from 'tamagui';

import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';

export function Screen({ title, children, onBack }: { title: string; children: ReactNode; onBack?: () => void }) {
  const { palette, language } = useDashboardContext();
  return <>
    <XStack px={18} py={9} items="center" gap={8}>
      {onBack && <View accessibilityRole="button" accessibilityLabel={copy(language, 'back')}
        onPress={onBack} w={44} h={44} ml={-8} items="center" justify="center" opacity="press:0.75">
        <ArrowLeft size={22} color={palette.accent} />
      </View>}
      <Text accessibilityRole="header" color="color" fontFamily="display" fontWeight="700" fontSize={30}>{title}</Text>
    </XStack>
    <ScrollView flex={1} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 18, gap: 12 }} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  </>;
}
