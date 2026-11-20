import { useActor } from '@xstate/react';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { Text, XStack, YStack } from 'tamagui';

import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import { widgetLayouts, widgetSizes, type WidgetSize } from './preferences';
import { Choices } from './studyComponents';
import { WidgetPreview } from './WidgetPreview';
import { widgetSizeActor } from './widgetSizeActor';

const layoutDescriptions = { current: 'currentDetail', focus: 'focusDetail', first: 'firstDetail' } as const;

export function WidgetLayouts({ initialSize }: { initialSize: WidgetSize }) {
  const { palette, language, layouts, setLayout } = useDashboardContext();
  const [selection, select] = useActor(widgetSizeActor, { input: initialSize });
  const size = selection.context;
  const activeLayout = layouts[size];

  return <>
    <Choices<WidgetSize> choices={widgetSizes} value={size} onChange={(size) => select({ type: 'select', size })} label={(option) => copy(language, option)} />
    <WidgetPreview layout={activeLayout} size={size} />
    <YStack accessibilityRole="radiogroup" bg="surface" borderColor="border-color" borderWidth={1} rounded={16} p={5} gap={4}>
      {widgetLayouts.map((layout) => {
        const selected = layout === activeLayout;
        const Icon = selected ? CheckCircle2 : Circle;
        return <XStack key={layout} accessibilityRole="radio" accessibilityState={{ checked: selected }}
          onPress={() => setLayout(size, layout)} minH={57} gap={12} px={12} py={9}
          items="center" bg={selected ? 'subtle' : 'surface'} rounded={11} opacity="press:0.8">
          <YStack flex={1} gap={3}>
            <Text color="color" fontSize={16} fontWeight="700">{copy(language, layout)}</Text>
            <Text color="muted" fontSize={13}>{copy(language, layoutDescriptions[layout])}</Text>
          </YStack>
          <Icon size={20} color={selected ? palette.accent : palette.muted} />
        </XStack>;
      })}
    </YStack>
  </>;
}
