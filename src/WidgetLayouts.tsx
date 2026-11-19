import { CheckCircle2, Circle } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import { widgetLayouts, widgetSizes, type WidgetSize } from './preferences';
import { Choices } from './studyComponents';
import { useWidgetPreview, WidgetPreview } from './WidgetPreview';

export function WidgetLayouts({ initialSize }: { initialSize: WidgetSize }) {
  const { palette, language, layouts, setLayout } = useDashboardContext();
  const [size, setSize] = useState(initialSize);
  const content = useWidgetPreview(true);

  return <>
    <Choices<WidgetSize> palette={palette} choices={widgetSizes} value={size} onChange={setSize} label={(option) => copy(language, option)} />
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
}

const styles = StyleSheet.create({
  option: { borderRadius: 16, borderWidth: 1.5, padding: 10, gap: 8 },
  label: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 3, gap: 8 },
});
