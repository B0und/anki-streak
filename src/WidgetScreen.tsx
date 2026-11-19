import { Host, Slider } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import { widgetSizes, type WidgetSize } from './preferences';
import { Action, Choices, Section } from './studyComponents';
import { themes } from './themes';
import { useWidgetPreview, WidgetPreview } from './WidgetPreview';

const moods = ['live', 'waiting', 'happy'] as const;

export function WidgetScreen({ openLayouts, openThemes }: {
  openLayouts(size: WidgetSize): void; openThemes(): void;
}) {
  const { dashboard, palette, language, layouts } = useDashboardContext();
  const [size, setSize] = useState<WidgetSize>('compact');
  const theme = themes[dashboard.themeId];
  const mood = dashboard.preview.kind === 'preview' ? dashboard.preview.mood : 'live';
  const content = useWidgetPreview();

  return <>
    <Pressable accessibilityRole="button" onPress={openThemes}
      style={({ pressed }) => [styles.row, styles.themeRow, {
        backgroundColor: palette.surface, borderColor: palette.line, opacity: pressed ? .75 : 1,
      }]}>
      <View style={[styles.themeIcon, { backgroundColor: palette.hero }]}>
        <Image source={theme[dashboard.mood]} resizeMode="cover" style={{ width: 31, height: 31 }} />
      </View>
      <Text style={{ flex: 1, color: palette.text, fontWeight: '700' }}>{copy(language, 'theme')}</Text>
      <Text style={{ color: palette.accent }}>{theme.name}</Text>
      <ChevronRight size={18} color={palette.accent} />
    </Pressable>
    <Section title={copy(language, 'preview')} palette={palette}>
      <Choices<WidgetSize> palette={palette} choices={widgetSizes} value={size} onChange={setSize} label={(key) => copy(language, key)} />
      <WidgetPreview layout={layouts[size]} size={size} content={content} />
      <View style={styles.transparency}>
        <Text style={{ flex: 1, color: palette.text }}>{copy(language, 'transparency')}</Text>
        <Text style={{ color: palette.accent, fontVariant: ['tabular-nums'] }}>{dashboard.transparency}%</Text>
      </View>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <Slider min={0} max={100} value={dashboard.transparency}
          colors={{ activeTrackColor: palette.accent, thumbColor: palette.accent, inactiveTrackColor: palette.line }}
          modifiers={[fillMaxWidth(), semantics({ contentDescription: copy(language, 'transparency') })]}
          onValueChange={(value) => dashboard.changeTransparency(Math.round(value))} />
      </Host>
      <Text style={{ color: palette.text }}>{copy(language, 'themePreview')}</Text>
      <Choices palette={palette} choices={moods} value={mood}
        onChange={(value) => value === 'live' ? dashboard.clearPreview() : dashboard.setPreviewMood(value)}
        label={(value) => copy(language, value === 'live' ? value : value === 'happy' ? 'happyMood' : 'waitingMood')} />
    </Section>
    <Section title={copy(language, 'widgetLayouts')} palette={palette}>
      {widgetSizes.map((size) => (
        <Pressable key={size} accessibilityRole="button" onPress={() => openLayouts(size)}
          style={({ pressed }) => [styles.row, { backgroundColor: palette.subtle, opacity: pressed ? .75 : 1 }]}>
          <Text style={{ flex: 1, color: palette.text, fontWeight: '700' }}>{copy(language, size)}</Text>
          <Text style={{ color: palette.accent, flexShrink: 1 }}>{copy(language, layouts[size])}</Text>
          <ChevronRight size={18} color={palette.accent} />
        </Pressable>
      ))}
    </Section>
    <Action palette={palette} primary disabled={dashboard.requesting}
      onPress={() => void dashboard.runAndroidRequest('pin')}>{copy(language, 'addWidget')}</Action>
  </>;
}

const styles = StyleSheet.create({
  row: { minHeight: 48, paddingHorizontal: 11, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  themeRow: { borderWidth: 1, borderRadius: 13 },
  themeIcon: { borderRadius: 6, overflow: 'hidden' },
  transparency: { flexDirection: 'row', marginTop: 4 },
});
