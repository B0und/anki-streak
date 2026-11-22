import { useLingui } from '@lingui/react';
import { useActor } from '@xstate/react';
import { useFocusEffect } from 'expo-router';
import { ChevronRight, Frown, Plus, Smile } from 'lucide-react-native';
import { useCallback } from 'react';
import { Image, Slider, Text, View, XStack, YStack } from 'tamagui';

import { useDashboard } from './dashboardMachine';
import { useAppAppearance } from './useAppAppearance';
import { messages } from './messages';
import { widgetSizes, type WidgetSize } from './preferences';
import { cardContentInset } from './screenLayout';
import { Choices } from './studyComponents';
import { themes } from './themes';
import { WidgetPreview } from './WidgetPreview';
import { previewBounds, widgetSizeActor } from './widgetSizeActor';

const previewHeight = 168;

export function WidgetScreen({ openLayouts, openThemes }: {
  openLayouts(size: WidgetSize, widgetId?: number): void; openThemes(): void;
}) {
  const { _ } = useLingui();
  const dashboard = useDashboard();
  const { layouts } = dashboard;
  const { palette } = useAppAppearance();
  const [selection, select] = useActor(widgetSizeActor, { input: {} });
  const { size, sizes, selectedWidgetId, flipMood } = selection.context;
  const candidates = sizes.filter((bounds) => bounds.size === size);
  const bounds = previewBounds(candidates, selectedWidgetId);
  const theme = themes[dashboard.themeId];
  const oppositeMood = dashboard.mood === 'happy' ? 'waiting' : 'happy';
  const mood = flipMood ? oppositeMood : dashboard.mood;
  const MoodIcon = mood === 'happy' ? Smile : Frown;

  useFocusEffect(useCallback(() => {
    select({ type: 'mood.reset' });
  }, [select]));

  return <>
    <XStack accessibilityRole="button" onPress={openThemes} minH={64} px={cardContentInset - 1} py={8}
      items="center" gap={12} bg="surface" borderWidth={1} borderColor="border-color" rounded={16}
      opacity="press:0.75">
      <View w={42} h={42} rounded={10} bg="hero" items="center" justify="center" overflow="hidden">
        <Image source={{ uri: theme[dashboard.mood] }} objectFit="contain" style={{ width: 36, height: 36 }} />
      </View>
      <YStack flex={1}>
        <Text color="muted" fontSize={12}>{_(messages.character)}</Text>
        <Text color="color" fontWeight="700" fontSize={17}>{theme.name}</Text>
      </YStack>
      <ChevronRight size={20} color={palette.muted} />
    </XStack>
    <YStack gap={12} p={cardContentInset - 1} bg="surface" borderWidth={1} borderColor="border-color" rounded={16}>
      <XStack items="center" justify="space-between" gap={10}>
        <Text flex={1} accessibilityRole="header" color="color" fontWeight="700" fontSize={18}>
          {_(messages.homeWidgetPreview)}
        </Text>
        <XStack accessibilityRole="button" accessibilityLabel={_(messages.addWidget)}
          accessibilityState={{ disabled: dashboard.requesting }} minH={48} minW={48} px={11} gap={5}
          items="center" justify="center" rounded={12} bg="accent"
          opacity={dashboard.requesting ? 0.55 : 'press:0.75'}
          onPress={dashboard.requesting ? undefined : () => void dashboard.runAndroidRequest('pin')}>
          <Plus size={18} color={palette.onAccent} />
          <Text color="on-accent" fontWeight="700">{_(messages.addWidgetShort)}</Text>
        </XStack>
      </XStack>
      <XStack items="center" gap={8}>
        <YStack flex={1}>
          <Choices choices={widgetSizes} value={size} onChange={(size) => select({ type: 'select', size })}
            label={(key) => _(messages[key])} />
        </YStack>
        <View accessibilityRole="button" accessibilityLabel={_(messages.themePreview)}
          accessibilityValue={{ text: _(messages[mood === 'happy' ? 'happyMood' : 'waitingMood']) }}
          w={48} h={48} items="center" justify="center" rounded={12} bg="subtle" opacity="press:0.75"
          onPress={() => select({ type: 'mood.flip' })}>
          <MoodIcon color={palette.accent} size={22} />
        </View>
      </XStack>
      {candidates.length > 1 && <Choices choices={candidates.map((item) => String(item.widgetId))}
        value={String(bounds?.widgetId)} onChange={(id) => select({ type: 'bounds', widgetId: Number(id) })}
        label={(id) => {
          const item = candidates.find((entry) => String(entry.widgetId) === id);
          return item ? `${Math.round(item.width)} × ${Math.round(item.height)}` : '';
        }} />}
      <YStack h={previewHeight} justify="center" rounded={12} bg="background">
        {bounds ? <WidgetPreview bounds={bounds} horizontalInset={cardContentInset} maxHeight={previewHeight} mood={mood} />
          : <Text text="center" color="muted">{_(messages.previewUnavailable)}</Text>}
      </YStack>
      <XStack accessibilityRole="button" onPress={() => openLayouts(size, bounds?.widgetId)} minH={48} gap={8}
        items="center" borderTopColor="border-color" borderTopWidth={1} opacity="press:0.75">
        <Text flex={1} color="color" fontWeight="700">{_(messages.layout)}</Text>
        <Text color="muted" shrink={1} maxW="60%">{_(messages[layouts[size]])}</Text>
        <ChevronRight size={20} color={palette.muted} />
      </XStack>
      <XStack gap={8} items="center">
        <Text flex={1} color="color" fontWeight="600">{_(messages.transparency)}</Text>
        <Text color="accent" fontVariant={['tabular-nums']}>{dashboard.transparency}%</Text>
      </XStack>
      <Slider size="md" mt={-8} min={0} max={100} step={1} value={[dashboard.transparency]} w="100%" minH={48}
        onValueChange={([value]) => { if (value !== undefined) dashboard.changeTransparency(value); }}>
        <Slider.Track bg="border-color">
          <Slider.TrackActive bg="accent" />
        </Slider.Track>
        <Slider.Thumb index={0} circular accessibilityLabel={_(messages.transparency)}
          accessible accessibilityRole="adjustable"
          accessibilityValue={{ min: 0, max: 100, now: dashboard.transparency }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={({ nativeEvent: { actionName } }) => {
            const delta = actionName === 'increment' ? 5 : -5;
            dashboard.changeTransparency(Math.min(100, Math.max(0, dashboard.transparency + delta)));
          }}
          bg="accent" borderColor="accent" />
      </Slider>
    </YStack>
  </>;
}
