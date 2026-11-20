import { CheckCircle2, Circle } from 'lucide-react-native';
import { useActor } from '@xstate/react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
    {content.sample && <Text style={{ color: palette.muted }}>{copy(language, 'sampleData')}</Text>}
    {widgetLayouts.map((layout) => {
      const selected = layout === layouts[size];
      const Icon = selected ? CheckCircle2 : Circle;
      return <Pressable key={layout} accessibilityRole="radio" accessibilityLabel={copy(language, layout)}
        accessibilityState={{ checked: selected }}
        onPress={() => setLayout(size, layout)}
        style={({ pressed }) => [styles.option, {
          backgroundColor: palette.surface, borderColor: selected ? palette.accent : palette.line, opacity: pressed ? .8 : 1,
        }]}>
        <View style={styles.label}>
          <Text style={{ flex: 1, color: palette.text, fontSize: 16, fontWeight: '700' }}>{copy(language, layout)}</Text>
          <Icon size={20} color={selected ? palette.accent : palette.muted} />
        </View>
        <WidgetPreview layout={layout} size={size} content={content} />
      </Pressable>;
    })}
  </>;
  return <>
    <Choices<WidgetSize> palette={palette} choices={widgetSizes} value={size} onChange={(size) => select({ type: 'select', size })} label={(option) => copy(language, option)} />
    {content.stats ? options(content) : <SampleWidgetPreviews key={`${dashboard.themeId}-${language}`} render={options} />}
  </>;
}

const styles = StyleSheet.create({
  option: { borderRadius: 16, borderWidth: 1.5, padding: 10, gap: 8 },
  label: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 3, gap: 8 },
});
