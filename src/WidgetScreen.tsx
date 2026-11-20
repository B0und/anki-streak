import { useActor } from '@xstate/react';
import { ChevronRight } from 'lucide-react-native';
import { Image, Slider, Text, XStack, YStack } from 'tamagui';

import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import { widgetSizes, type WidgetSize } from './preferences';
import { Action, Choices, Section } from './studyComponents';
import { themes } from './themes';
import { SampleWidgetPreviews, useWidgetPreview, WidgetPreview } from './WidgetPreview';
import { widgetSizeActor } from './widgetSizeActor';

const moods = ['live', 'waiting', 'happy'] as const;

export function WidgetScreen({ openLayouts, openThemes }: {
  openLayouts(size: WidgetSize): void; openThemes(): void;
}) {
  const { dashboard, palette, language, layouts } = useDashboardContext();
  const [selection, select] = useActor(widgetSizeActor, { input: 'compact' });
  const size = selection.context;
  const theme = themes[dashboard.themeId];
  const mood = dashboard.previewMood ?? 'live';
  const content = useWidgetPreview();
  const renderPreview = (preview: typeof content) => <>
    {preview.sample && <Text color="muted" fontSize={12}>{copy(language, 'sampleData')}</Text>}
    <WidgetPreview layout={layouts[size]} size={size} content={preview} />
  </>;

  return <>
    <YStack gap={10}>
      <Choices<WidgetSize> choices={widgetSizes} value={size} onChange={(size) => select({ type: 'select', size })} label={(key) => copy(language, key)} />
      {content.stats ? renderPreview(content) : <SampleWidgetPreviews key={`${dashboard.themeId}-${language}`} render={renderPreview} />}
      <Action primary disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('pin')}>{copy(language, 'addWidget')}</Action>
      {size === 'tall' && <Text color="muted" fontSize={13}>{copy(language, 'resizeWidget')}</Text>}
    </YStack>
    <Section title={copy(language, 'appearance')}>
      <XStack accessibilityRole="button" onPress={openThemes} minH={54} py={5}
        items="center" gap={10} opacity="press:0.75">
        <XStack w={42} h={42} rounded={9} bg="hero" overflow="hidden">
          <Image source={theme[dashboard.mood]} objectFit="cover" style={{ width: '100%', height: '100%' }} />
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
      <Text color="color" fontWeight="600">{copy(language, 'themePreview')}</Text>
      <Choices choices={moods} value={mood}
        onChange={(value) => value === 'live' ? dashboard.clearPreview() : dashboard.setPreviewMood(value)}
        label={(value) => copy(language, value === 'live' ? value : value === 'happy' ? 'happyMood' : 'waitingMood')} />
    </Section>
  </>;
}
