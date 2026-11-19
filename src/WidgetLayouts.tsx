import { CheckCircle2, Circle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { historyDays, renderWidget } from './activity';
import type { WidgetArtwork } from './AnkiWidget';
import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import { widgetLayouts, widgetSizes, type WidgetLayout, type WidgetSize } from './preferences';
import { Choices } from './studyComponents';
import { themes, type WidgetTheme } from './themes';

const previewStats = { today: 18, streak: 24, dailyReviewed: 42, dailyLearned: 10 };
const previewHistory = Array.from({ length: historyDays }, (_, index) =>
  index === historyDays - 1 ? previewStats.today : ((index * 73 + index % 7 * 19) % 151) % 62);

function LayoutPreview({ layout, size, artwork }: { layout: WidgetLayout; size: WidgetSize; artwork?: WidgetArtwork }) {
  const { dashboard, palette, language } = useDashboardContext();
  const [width, setWidth] = useState(0);
  const theme = themes[dashboard.themeId];
  const preview = dashboard.preview.kind === 'preview' ? dashboard.preview.mood : dashboard.mood;
  const tall = size === 'tall';
  const height = width * (tall ? .45 : .245);
  const portraitAspect = artwork?.portraitAspect ?? 1.04;
  const portraitWidth = Math.min(Math.max(0, height - 4) * portraitAspect, width * (tall ? .58 : .38));
  const bitmap = tall ? artwork?.tallStats : artwork?.compactStats;
  const overlap = tall && layout === 'current' ? Math.min(12, portraitWidth * .08) : 0;
  const statsWidth = Math.max(0, width - portraitWidth - 6 + overlap);
  const focus = layout === 'focus';
  const stats = dashboard.activity?.kind === 'ready' ? dashboard.activity : previewStats;

  return <View onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
    style={[styles.preview, { height: height || (tall ? 135 : 74), backgroundColor: palette.subtle }]}>
    <View style={[StyleSheet.absoluteFill, {
      backgroundColor: layout === 'current' ? '#000000' : theme.card, opacity: 1 - dashboard.transparency / 100,
    }]} />
    <Image source={theme[preview]} resizeMode="contain"
      style={{ position: 'absolute', right: 6, bottom: 0, width: portraitWidth, height: portraitWidth / portraitAspect }} />
    {layout === 'current' ? bitmap && <Image source={{ uri: bitmap.uri }} resizeMode="contain"
      style={{ width: statsWidth, height: Math.min(height, statsWidth / bitmap.aspect) }} /> :
      <View style={{ paddingLeft: 14, width: statsWidth, gap: 1 }}>
        <View style={{ flexDirection: tall ? 'column' : 'row', alignItems: tall ? 'flex-start' : 'center', gap: 5 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: tall ? 44 : 30 }} adjustsFontSizeToFit numberOfLines={1}>
            {focus ? stats.today : stats.streak}
          </Text>
          <Text style={{ color: '#FFFFFF', flexShrink: 1, fontSize: tall ? 14 : 12 }}>
            {copy(language, focus ? 'reviewed' : 'streak')}
          </Text>
        </View>
        <Text style={{ color: theme.accent, fontSize: tall ? 14 : 12, fontWeight: '600' }} numberOfLines={1}>
          {copy(language, focus ? 'streak' : 'reviewed')}: {focus ? stats.streak : stats.today}
        </Text>
      </View>}
  </View>;
}

export function WidgetLayouts({ initialSize }: { initialSize: WidgetSize }) {
  const { dashboard, palette, language, layouts, setLayout } = useDashboardContext();
  const [size, setSize] = useState(initialSize);
  const [example, setExample] = useState<{ theme: WidgetTheme; artwork: WidgetArtwork }>();
  const { themeId } = dashboard;
  const live = dashboard.widgetArtwork;
  const artwork = live?.theme === themeId ? live.artwork : example?.theme === themeId ? example.artwork : undefined;

  useEffect(() => {
    if (live?.theme === themeId) return;
    let active = true;
    const { streak, today, dailyReviewed, dailyLearned } = previewStats;
    void renderWidget(streak, today, previewHistory, dailyReviewed, dailyLearned, themeId, 'preview')
      .then((artwork) => { if (active) setExample({ theme: themeId, artwork }); }).catch(() => {});
    return () => { active = false; };
  }, [live, themeId, language]);

  return <>
    <Choices<WidgetSize> palette={palette} choices={widgetSizes} value={size} onChange={setSize} label={(option) => copy(language, option)} />
    {dashboard.activity?.kind !== 'ready' && <Text style={{ color: palette.muted }}>{copy(language, 'sampleData')}</Text>}
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
        <LayoutPreview layout={layout} size={size} artwork={artwork} />
      </Pressable>;
    })}
  </>;
}

const styles = StyleSheet.create({
  option: { borderRadius: 16, borderWidth: 1.5, padding: 10, gap: 8 },
  label: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 3, gap: 8 },
  preview: { overflow: 'hidden', borderRadius: 13, justifyContent: 'center' },
});
