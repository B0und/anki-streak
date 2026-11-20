import { Text, YStack } from 'tamagui';

import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import { widgetLayouts, type WidgetSize } from './preferences';
import { WidgetPreview } from './WidgetPreview';

export function WidgetLayouts({ initialSize }: { initialSize: WidgetSize }) {
  const { language, layouts, setLayout } = useDashboardContext();
  const bounds = { size: initialSize, width: 360, height: initialSize === 'compact' ? 102 : 204 };

  return <YStack gap={14} accessibilityRole="radiogroup">
    {widgetLayouts.map((layout) => {
      const checked = layout === layouts[initialSize];
      return <YStack key={layout} accessibilityRole="radio" accessibilityLabel={copy(language, layout)}
        accessibilityState={{ checked }} onPress={() => setLayout(initialSize, layout)}
        borderWidth={2} borderColor={checked ? 'accent' : 'border-color'}
        p={5} gap={7} rounded={20} opacity="press:0.8" items="center">
        <WidgetPreview bounds={bounds} layout={layout} gallery />
        <Text color={checked ? 'accent' : 'muted'} fontSize={13} fontWeight="700" pb={4}>{copy(language, layout)}</Text>
      </YStack>;
    })}
  </YStack>;
}
