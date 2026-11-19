import { requireNativeView } from 'expo';
import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type ViewProps } from 'react-native';

import { historyDays, renderWidget } from './activity';
import type { WidgetArtwork, WidgetProps } from './AnkiWidget';
import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import type { WidgetLayout, WidgetSize } from './preferences';
import { themes, type WidgetTheme } from './themes';
import { widgetBackdrop, widgetCard } from './widgetDesign';

const NativePreview = requireNativeView<ViewProps & { widgetName: string; propsJson: string }>('ExpoWidgets', 'WidgetPreviewView');
const previewAspect: Record<WidgetSize, number> = { compact: .27, tall: .56 };
const sampleStats = { today: 18, streak: 24, dailyReviewed: 42, dailyLearned: 10 };
const sampleHistory = Array.from({ length: historyDays }, (_, index) =>
  index === historyDays - 1 ? sampleStats.today : ((index * 73 + index % 7 * 19) % 151) % 62);

export function useWidgetPreview(sampleWhenDisconnected = false) {
  const { dashboard, language } = useDashboardContext();
  const [example, setExample] = useState<{ theme: WidgetTheme; language: typeof language; artwork: WidgetArtwork }>();
  const { themeId } = dashboard;
  const live = dashboard.widgetArtwork;
  const ready = dashboard.activity?.kind === 'ready' ? dashboard.activity : undefined;
  const sample = sampleWhenDisconnected && !ready;
  const sampleArt = example?.theme === themeId && example.language === language ? example.artwork : undefined;
  const artwork = live?.theme === themeId ? live.artwork : sample ? sampleArt : undefined;

  useEffect(() => {
    if (!sample) return;
    let active = true;
    const { streak, today, dailyReviewed, dailyLearned } = sampleStats;
    void renderWidget(streak, today, sampleHistory, dailyReviewed, dailyLearned, themeId, 'preview')
      .then((artwork) => { if (active) setExample({ theme: themeId, language, artwork }); }).catch(() => {});
    return () => { active = false; };
  }, [sample, themeId, language]);

  return { artwork, stats: sample ? sampleStats : ready, sample };
}

export function WidgetPreview({ layout, size, content }: {
  layout: WidgetLayout; size: WidgetSize; content: ReturnType<typeof useWidgetPreview>;
}) {
  const { dashboard, palette, language } = useDashboardContext();
  const { width: windowWidth } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const theme = themes[dashboard.themeId];
  const { artwork, stats, sample } = content;
  const mood = dashboard.preview.kind === 'preview' ? dashboard.preview.mood : sample ? 'happy' : dashboard.mood;
  const drawable = mood === 'happy' ? theme.happyDrawable : theme.waitingDrawable;
  const card = stats && widgetCard(layout, language, stats, theme.accent);
  const payload: WidgetProps = {
    artwork: artwork ? { ...artwork, portraitDrawable: drawable } : null,
    description: stats ? copy(language, 'activityDescription', {
      name: theme.name, streak: stats.streak, today: stats.today, reviews: stats.dailyReviewed, learned: stats.dailyLearned,
    }) : '',
    waitingDrawable: drawable,
    backdrop: '#00000000',
    cardBackdrop: '#00000000',
    connectLabel: copy(language, 'connectWidget'),
    previewSize: size,
    ...(card && { card }),
  };
  const backdrop = widgetBackdrop(artwork && card ? theme.card : '#000000', dashboard.transparency);

  return <View onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
    style={[styles.frame, { height: (width || windowWidth - 32) * previewAspect[size], backgroundColor: palette.hero }]}>
    <View pointerEvents="none" style={[styles.wallpaper, { backgroundColor: palette.line }]} />
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: backdrop }]} />
    <NativePreview pointerEvents="none" style={StyleSheet.absoluteFill}
      widgetName="AnkiStreak" propsJson={JSON.stringify(payload)} />
  </View>;
}

const styles = StyleSheet.create({
  frame: { borderRadius: 20, overflow: 'hidden' },
  wallpaper: { position: 'absolute', width: '125%', height: '125%', left: '-35%', top: '48%', transform: [{ rotate: '-14deg' }] },
});
