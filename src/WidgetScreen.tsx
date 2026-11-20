import { useActor } from '@xstate/react';
import { ChevronRight, Frown, Smile, ScanFace } from 'lucide-react-native';
import { Image, Slider, Text, View, XStack, YStack } from 'tamagui';

import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import { widgetSizes, type WidgetSize } from './preferences';
import { Action, Choices, Section } from './studyComponents';
import { themes } from './themes';
import { WidgetPreview } from './WidgetPreview';
import { previewBounds, widgetSizeActor } from './widgetSizeActor';

export function WidgetScreen({ openLayouts, openThemes }: {
  openLayouts(size: WidgetSize): void; openThemes(): void;
}) {
  const { dashboard, palette, language, layouts } = useDashboardContext();
  const [selection, select] = useActor(widgetSizeActor, { input: {} });
  const { size, sizes, selectedWidgetId } = selection.context;
  const candidates = sizes.filter((bounds) => bounds.size === size);
  const showDimensions = widgetSizes.some((key) => sizes.filter((item) => item.size === key).length > 1);
  const bounds = previewBounds(candidates, selectedWidgetId);
  const theme = themes[dashboard.themeId];
  const mood = dashboard.previewMood ?? 'live';
  const MoodIcon = mood === 'waiting' ? Frown : mood === 'happy' ? Smile : ScanFace;

  return <>
    <YStack gap={10}>
      <Choices<WidgetSize> choices={widgetSizes} value={size} onChange={(size) => select({ type: 'select', size })} label={(key) => copy(language, key)} />
      <XStack items="center" justify="space-between" minH={48}>
        <Text color="muted" flex={1} numberOfLines={1}>
          {bounds?.widgetId === undefined ? copy(language, 'exampleWidgetSize') : ''}
        </Text>
        <View accessibilityRole="button" accessibilityLabel={copy(language, 'themePreview')}
          accessibilityValue={{ text: copy(language, mood === 'live' ? 'live' : mood === 'happy' ? 'happyMood' : 'waitingMood') }}
          w={48} h={48} items="center" justify="center" rounded={12} bg="subtle"
          onPress={() => mood === 'happy' ? dashboard.clearPreview() : dashboard.setPreviewMood(mood === 'live' ? 'waiting' : 'happy')}>
          <MoodIcon color={palette.accent} size={22} />
        </View>
      </XStack>
      <YStack h={188}>
        {bounds && <WidgetPreview bounds={bounds} />}
      </YStack>
      {showDimensions && <YStack h={56} overflow="hidden">
        {candidates.length > 1 && <Choices choices={candidates.map((item) => String(item.widgetId))}
          value={String(bounds?.widgetId)} onChange={(id) => select({ type: 'bounds', widgetId: Number(id) })}
          label={(id) => {
            const item = candidates.find((entry) => String(entry.widgetId) === id);
            return item ? `${Math.round(item.width)} × ${Math.round(item.height)}` : '';
          }} />}
      </YStack>}
      <Action primary disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('pin')}>{copy(language, 'addWidget')}</Action>

    </YStack>
    <Section title={copy(language, 'appearance')}>
      <XStack accessibilityRole="button" onPress={openThemes} minH={54} py={5}
        items="center" gap={10} opacity="press:0.75">
        <XStack w={42} h={42} rounded={9} bg="hero" items="center" justify="center" overflow="hidden">
          <Image source={theme[dashboard.mood]} objectFit="contain" style={{ width: 36, height: 36 }} />
        </XStack>
        <YStack flex={1} gap={2}>
          <Text color="color" fontWeight="700">{copy(language, 'theme')}</Text>
          <Text color="muted" fontSize={13}>{theme.name}</Text>
        </YStack>
        <ChevronRight size={20} color={palette.muted} />
      </XStack>
      <XStack accessibilityRole="button" onPress={() => openLayouts(size)} minH={48} gap={10}
        items="center" borderTopColor="border-color" borderTopWidth={1} pt={9} opacity="press:0.75">
        <Text flex={1} color="color" fontWeight="700">{copy(language, 'layout')}</Text>
        <Text color="muted" shrink={1} maxW="60%">{copy(language, layouts[size])}</Text>
        <ChevronRight size={20} color={palette.muted} />
      </XStack>
      <XStack gap={8} items="center">
        <Text flex={1} color="color" fontWeight="600">{copy(language, 'transparency')}</Text>
        <Text color="accent" fontVariant={['tabular-nums']}>{dashboard.transparency}%</Text>
      </XStack>
      <Slider size="md" mt={-8} min={0} max={100} step={1} value={[dashboard.transparency]} w="100%" minH={48}
        onValueChange={([value]) => { if (value !== undefined) dashboard.changeTransparency(value); }}>
        <Slider.Track bg="border-color">
          <Slider.TrackActive bg="accent" />
        </Slider.Track>
        <Slider.Thumb index={0} circular accessibilityLabel={copy(language, 'transparency')}
          accessible accessibilityRole="adjustable"
          accessibilityValue={{ min: 0, max: 100, now: dashboard.transparency }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={({ nativeEvent: { actionName } }) => {
            const delta = actionName === 'increment' ? 5 : -5;
            dashboard.changeTransparency(Math.min(100, Math.max(0, dashboard.transparency + delta)));
          }}
          bg="accent" borderColor="accent" />
      </Slider>
    </Section>
  </>;
}
