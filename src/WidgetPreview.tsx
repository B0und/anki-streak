import { createEffectActor, createEffectLogic, join } from '@xstate/effect';
import { useActor } from '@xstate/react';
import { Effect, Option, Schema } from 'effect';
import { requireNativeView } from 'expo';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import { createAsyncLogic, types } from 'xstate';

import { historyDays, renderWidget } from './activity';
import type { WidgetArtwork, WidgetProps } from './AnkiWidget';
import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import type { WidgetLayout, WidgetSize } from './preferences';
import { themes } from './themes';
import { widgetBackdrop, widgetCard } from './widgetDesign';

const NativePreview = requireNativeView<ViewProps & { widgetName: string; propsJson: string }>('ExpoWidgets', 'WidgetPreviewView');
const previewAspect: Record<WidgetSize, number> = { compact: .27, tall: .56 };
const sampleStats = { today: 18, streak: 24, dailyReviewed: 42, dailyLearned: 10 };
const sampleHistory = Array.from({ length: historyDays }, (_, index) =>
  index === historyDays - 1 ? sampleStats.today : ((index * 73 + index % 7 * 19) % 151) % 62);

const sampleInput = Schema.Struct({
  theme: Schema.Literals(['miku', '2b', 'emilia']),
  language: Schema.Literals(['en', 'ru']),
});

const sampleArtwork = createEffectLogic({
  schemas: { input: sampleInput },
  effect: ({ input }) => {
    const { streak, today, dailyReviewed, dailyLearned } = sampleStats;
    return Effect.tryPromise(() => renderWidget(streak, today, sampleHistory, dailyReviewed, dailyLearned,
      input.theme, 'preview', input.language));
  },
});

const galleryArtwork = createAsyncLogic({
  schemas: { input: types<typeof sampleInput.Type>() },
  run: ({ input, signal }) => Effect.runPromise(
    createEffectActor(sampleArtwork, { input }).pipe(
      Effect.flatMap(join), Effect.scoped,
      Effect.tapError((error) => Effect.logWarning('Sample widget artwork unavailable', error)),
      Effect.option,
    ), { signal },
  ),
});

type PreviewContent = {
  artwork?: WidgetArtwork;
  stats?: typeof sampleStats;
  sample?: boolean;
  unavailable?: boolean;
  revision?: number;
};

export function useWidgetPreview(): PreviewContent {
  const { dashboard } = useDashboardContext();
  const live = dashboard.widgetArtwork;
  return {
    artwork: live?.theme === dashboard.themeId && live.activity === dashboard.activity ? live.artwork : undefined,
    revision: live?.revision,
    stats: dashboard.activity?.kind === 'ready' ? dashboard.activity : undefined,
  };
}

export function SampleWidgetPreviews({ render }: { render(content: PreviewContent): React.ReactNode }) {
  const { dashboard, language } = useDashboardContext();
  const [sample] = useActor(galleryArtwork, { input: { theme: dashboard.themeId, language } });
  return render({
    artwork: sample.output ? Option.getOrUndefined(sample.output) : undefined,
    stats: sampleStats,
    sample: true,
    unavailable: sample.output !== undefined && Option.isNone(sample.output),
  });
}

export function WidgetPreview({ layout, size, content }: {
  layout: WidgetLayout; size: WidgetSize; content: ReturnType<typeof useWidgetPreview>;
}) {
  const { dashboard, palette, language } = useDashboardContext();
  const theme = themes[dashboard.themeId];
  const { artwork, stats, sample } = content;
  const mood = dashboard.previewMood ?? (sample ? 'happy' : dashboard.mood);
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

  return <View style={[styles.frame, { aspectRatio: 1 / previewAspect[size], backgroundColor: palette.hero }]}>
    <View pointerEvents="none" style={[styles.wallpaper, { backgroundColor: palette.line }]} />
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: backdrop }]} />
    {content.unavailable ? <Text style={[styles.placeholder, { color: palette.text }]}>{copy(language, 'previewUnavailable')}</Text>
      : <NativePreview pointerEvents="none" style={StyleSheet.absoluteFill}
      widgetName="AnkiStreak" propsJson={JSON.stringify({ ...payload, revision: content.revision })} />}
  </View>;
}

const styles = StyleSheet.create({
  placeholder: { textAlign: 'center', margin: 'auto' },
  frame: { justifyContent: 'center', borderRadius: 20, overflow: 'hidden' },
  wallpaper: { position: 'absolute', width: '125%', height: '125%', left: '-35%', top: '48%', transform: [{ rotate: '-14deg' }] },
});
