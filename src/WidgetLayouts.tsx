import { useLingui } from '@lingui/react';
import { useActor } from '@xstate/react';
import { Check, Circle } from 'lucide-react-native';
import { Text, XStack, YStack } from 'tamagui';

import { DashboardActorContext } from './dashboardMachine';
import { messages } from './messages';
import { widgetLayouts, widgetSizes, type WidgetSize } from './preferences';
import { Screen } from './Screen';
import { cardContentInset } from './screenLayout';
import { Choices } from './studyComponents';
import { useAppAppearance } from './useAppAppearance';
import { WidgetPreview } from './WidgetPreview';
import { previewBounds, widgetSizeActor } from './widgetSizeActor';

export function WidgetLayouts({ initialSize, widgetId, onBack }: {
  initialSize: WidgetSize; widgetId: number | null; onBack(): void;
}) {
  const { _ } = useLingui();
  const layouts = DashboardActorContext.useSelector(({ context }) => context.layouts);
  const { send } = DashboardActorContext.useActorRef();
  const { palette } = useAppAppearance();
  const [selection, select] = useActor(widgetSizeActor, { input: { size: initialSize } });
  const { size, sizes } = selection.context;
  const bounds = previewBounds(sizes.filter((item) => item.size === size), size === initialSize ? widgetId : null);

  return <Screen title={_(messages.widgetLayouts)} onBack={onBack} scrollKey={size}
    toolbar={<Choices choices={widgetSizes} value={size} label={(key) => _(messages[key])}
      onChange={(size) => select({ type: 'select', size })} />}>
    <YStack gap={14} accessibilityRole="radiogroup">
      {bounds ? widgetLayouts[size].map((layout) => {
        const checked = layout === layouts[size];
        const SelectionIcon = checked ? Check : Circle;
        return <YStack key={layout} accessibilityRole="radio" accessibilityLabel={_(messages[layout])}
          accessibilityState={{ checked }} onPress={() => send({ type: 'widget.layout', size, value: layout })}
          borderWidth={2} borderColor={checked ? 'accent' : 'border-color'} bg="surface"
          p={cardContentInset - 2} gap={8} rounded={16} opacity="press:0.8">
          <XStack minH={24} items="center" gap={8}>
            <Text flex={1} color={checked ? 'accent' : 'color'} fontSize={15} fontWeight="700">{_(messages[layout])}</Text>
            <SelectionIcon size={18} color={checked ? palette.accent : palette.muted} />
          </XStack>
          <WidgetPreview bounds={bounds} layout={layout} horizontalInset={cardContentInset} maxHeight={188} />
        </YStack>;
      }) : <Text color="muted">{_(messages.previewUnavailable)}</Text>}
    </YStack>
  </Screen>;
}
