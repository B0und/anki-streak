import { useActor } from '@xstate/react';
import { ChevronRight } from 'lucide-react-native';
import { Image, Slider, Text, XStack } from 'tamagui';

import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import { widgetSizes, type WidgetSize } from './preferences';
import { Action, Choices, Section } from './studyComponents';
import { themes } from './themes';
import { useWidgetPreview, WidgetPreview } from './WidgetPreview';
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

  return <>
    <XStack accessibilityRole="button" onPress={openThemes} minH={48} px={11} rounded={13}
      items="center" gap={8} bg="surface" borderColor="border-color" borderWidth={1} opacity="press:0.75">
      <Image source={theme[dashboard.mood]} resizeMode="cover" w={31} h={31} rounded={6} bg="hero" />
      <Text flex={1} color="color" fontWeight="700">{copy(language, 'theme')}</Text>
      <Text color="accent">{theme.name}</Text>
      <ChevronRight size={18} color={palette.accent} />
    </XStack>
    <Section title={copy(language, 'preview')}>
      <Choices<WidgetSize> choices={widgetSizes} value={size} onChange={(size) => select({ type: 'select', size })} label={(key) => copy(language, key)} />
      <WidgetPreview layout={layouts[size]} size={size} content={content} />
      <XStack mt={4}>
        <Text flex={1} color="color">{copy(language, 'transparency')}</Text>
        <Text color="accent" fontVariant={['tabular-nums']}>{dashboard.transparency}%</Text>
      </XStack>
      <Slider size="md" min={0} max={100} step={1} value={[dashboard.transparency]} w="100%" px={10}
        onValueChange={([value]) => { if (value !== undefined) dashboard.changeTransparency(value); }}>
        <Slider.Track bg="border-color">
          <Slider.TrackActive bg="accent" />
        </Slider.Track>
        <Slider.Thumb index={0} circular accessibilityLabel={copy(language, 'transparency')}
          bg="accent" borderColor="accent" />
      </Slider>
      <Text color="color">{copy(language, 'themePreview')}</Text>
      <Choices choices={moods} value={mood}
        onChange={(value) => value === 'live' ? dashboard.clearPreview() : dashboard.setPreviewMood(value)}
        label={(value) => copy(language, value === 'live' ? value : value === 'happy' ? 'happyMood' : 'waitingMood')} />
    </Section>
    <Section title={copy(language, 'widgetLayouts')}>
      {widgetSizes.map((size) => (
        <XStack key={size} accessibilityRole="button" onPress={() => openLayouts(size)}
          minH={48} px={11} rounded={11} items="center" gap={8} bg="subtle" opacity="press:0.75">
          <Text flex={1} color="color" fontWeight="700">{copy(language, size)}</Text>
          <Text color="accent" shrink={1}>{copy(language, layouts[size])}</Text>
          <ChevronRight size={18} color={palette.accent} />
        </XStack>
      ))}
    </Section>
    <Action primary disabled={dashboard.requesting}
      onPress={() => void dashboard.runAndroidRequest('pin')}>{copy(language, 'addWidget')}</Action>
  </>;
}
