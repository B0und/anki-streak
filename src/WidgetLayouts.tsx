import { useActor } from '@xstate/react';
import { Check, Circle } from 'lucide-react-native';
import { Text, XStack, YStack } from 'tamagui';

import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import { widgetLayouts, widgetSizes, type WidgetSize } from './preferences';
import { Screen } from './Screen';
import { cardContentInset } from './screenLayout';
import { Choices } from './studyComponents';
import { WidgetPreview } from './WidgetPreview';
import { previewBounds, widgetSizeActor } from './widgetSizeActor';

export function WidgetLayouts({ initialSize, widgetId, onBack }: {
  initialSize: WidgetSize; widgetId: number | null; onBack(): void;
}) {
  const { language, layouts, palette, setLayout } = useDashboardContext();
  const [selection, select] = useActor(widgetSizeActor, { input: { size: initialSize } });
  const { size, sizes } = selection.context;
  const bounds = previewBounds(sizes.filter((item) => item.size === size), size === initialSize ? widgetId : null);

  return <Screen title={copy(language, 'widgetLayouts')} onBack={onBack} scrollKey={size}
    toolbar={<Choices choices={widgetSizes} value={size} label={(key) => copy(language, key)}
      onChange={(size) => select({ type: 'select', size })} />}>
    <YStack gap={14} accessibilityRole="radiogroup">
      {bounds ? widgetLayouts[size].map((layout) => {
        const checked = layout === layouts[size];
        const SelectionIcon = checked ? Check : Circle;
        return <YStack key={layout} accessibilityRole="radio" accessibilityLabel={copy(language, layout)}
          accessibilityState={{ checked }} onPress={() => setLayout(size, layout)}
          borderWidth={2} borderColor={checked ? 'accent' : 'border-color'} bg="surface"
          p={cardContentInset - 2} gap={8} rounded={16} opacity="press:0.8">
          <XStack minH={24} items="center" gap={8}>
            <Text flex={1} color={checked ? 'accent' : 'color'} fontSize={15} fontWeight="700">{copy(language, layout)}</Text>
            <SelectionIcon size={18} color={checked ? palette.accent : palette.muted} />
          </XStack>
          <WidgetPreview bounds={bounds} layout={layout} horizontalInset={cardContentInset} maxHeight={188} />
        </YStack>;
      }) : <Text color="muted">{copy(language, 'previewUnavailable')}</Text>}
    </YStack>
  </Screen>;
}
