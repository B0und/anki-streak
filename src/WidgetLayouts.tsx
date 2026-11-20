import { useActor } from '@xstate/react';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { Text, XStack, YStack } from 'tamagui';

import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import { widgetLayouts, widgetSizes, type WidgetSize } from './preferences';
import { Choices } from './studyComponents';
import { SampleWidgetPreviews, useWidgetPreview, WidgetPreview } from './WidgetPreview';
import { widgetSizeActor } from './widgetSizeActor';

export function WidgetLayouts({ initialSize }: { initialSize: WidgetSize }) {
  const { dashboard, palette, language, layouts, setLayout } = useDashboardContext();
  const [selection, select] = useActor(widgetSizeActor, { input: initialSize });
  const size = selection.context;
  const content = useWidgetPreview();

  const options = (content: ReturnType<typeof useWidgetPreview>) => <>
    {content.sample && <Text color="muted">{copy(language, 'sampleData')}</Text>}
    {widgetLayouts.map((layout) => {
      const selected = layout === layouts[size];
      const Icon = selected ? CheckCircle2 : Circle;
      return <YStack key={layout} accessibilityRole="radio" accessibilityLabel={copy(language, layout)}
        accessibilityState={{ checked: selected }} onPress={() => setLayout(size, layout)}
        bg="surface" borderColor={selected ? 'accent' : 'border-color'} borderWidth={1.5} rounded={16}
        p={10} gap={8} opacity="press:0.8">
        <XStack items="center" px={3} gap={8}>
          <Text flex={1} color="color" fontSize={16} fontWeight="700">{copy(language, layout)}</Text>
          <Icon size={20} color={selected ? palette.accent : palette.muted} />
        </XStack>
        <WidgetPreview layout={layout} size={size} content={content} />
      </YStack>;
    })}
  </>;
  return <>
    <Choices<WidgetSize> choices={widgetSizes} value={size} onChange={(size) => select({ type: 'select', size })} label={(option) => copy(language, option)} />
    {content.stats ? options(content) : <SampleWidgetPreviews key={`${dashboard.themeId}-${language}`} render={options} />}
  </>;
}
