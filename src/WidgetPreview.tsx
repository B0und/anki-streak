import { requireNativeView } from 'expo';
import { StyleSheet, useWindowDimensions, type ViewProps } from 'react-native';
import { YStack } from 'tamagui';

import { historyDays, type ReviewMood } from './activity';
import { useDashboardContext } from './dashboardContext';
import { getQuestTargets, type WidgetLayout } from './preferences';
import { screenInset, screenMaxWidth } from './screenLayout';
import { widgetProps } from './widgetDesign';
import type { WidgetPreviewSize } from './widgetSizeActor';

const NativePreview = requireNativeView<ViewProps & {
  widgetName: string;
  sampleProps: string;
  widthDp: number;
  heightDp: number;
  previewMood: 'live' | 'waiting' | 'happy';
}>('ExpoWidgets', 'WidgetPreviewView');

const sampleStats = {
  today: 200, newToday: 2, dueReviews: 7, streak: 20, dailyReviewed: 112, dailyLearned: 12,
  history: { counts: Array.from({ length: historyDays }, () => 1), todayRow: 4 },
};

export function WidgetPreview({ bounds, layout, horizontalInset, maxHeight, mood }: {
  bounds: WidgetPreviewSize; layout?: WidgetLayout; horizontalInset: number; maxHeight: number; mood?: ReviewMood;
}) {
  const { dashboard, language, layouts } = useDashboardContext();
  const { width } = useWindowDimensions();
  const ready = dashboard.activity?.kind === 'ready' ? dashboard.activity : null;
  const stats = ready ?? (layout ? sampleStats : null);
  const props = widgetProps({
    stats,
    themeId: dashboard.themeId,
    language,
    layouts: layout ? { ...layouts, [bounds.size]: layout } : layouts,
    transparency: dashboard.transparency,
    targets: getQuestTargets(),
  });
  const displayWidth = Math.min(Math.min(width, screenMaxWidth) - (screenInset + horizontalInset) * 2,
    bounds.width, maxHeight * bounds.width / bounds.height);

  return <YStack w={displayWidth} h={displayWidth * bounds.height / bounds.width} self="center"
    rounded={16} overflow="hidden">
    <NativePreview pointerEvents="none" style={StyleSheet.absoluteFill} widgetName="AnkiStreak"
      sampleProps={JSON.stringify(props)} previewMood={mood ?? 'live'}
      widthDp={bounds.width} heightDp={bounds.height} />
  </YStack>;
}
