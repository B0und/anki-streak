import { createEffectActor, createEffectLogic, join } from '@xstate/effect';
import { useActor } from '@xstate/react';
import { Effect, Option, Schema } from 'effect';
import { requireNativeView } from 'expo';
import { useLayoutEffect } from 'react';
import { StyleSheet, type ViewProps } from 'react-native';
import { Text, YStack } from 'tamagui';
import { createAsyncLogic, setup, types } from 'xstate';

import { historyDays, historyRows, renderWidget } from './activity';
import type { WidgetArtwork, WidgetProps } from './AnkiWidget';
import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import type { WidgetLayout, WidgetSize } from './preferences';
import { themes } from './themes';
import { currentTall, widgetBackdrop, widgetCard } from './widgetDesign';

const NativePreview = requireNativeView<ViewProps & { widgetName: string; propsJson: string }>('ExpoWidgets', 'WidgetPreviewView');
const previewAspect: Record<WidgetSize, number> = { compact: .27, tall: .56 };
const sampleHistory = {
  counts: Array.from({ length: historyDays }, (_, index) =>
    index === historyDays - 1 ? 18 : ((index * 73 + index % historyRows * 19) % 151) % 62),
  todayRow: 4,
};
const sampleStats = { today: 18, streak: 24, dailyReviewed: 42, dailyLearned: 10, history: sampleHistory };

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

type SampleRequest = typeof sampleInput.Type;
type SampleFrame = SampleRequest & { artwork: WidgetArtwork };

const previewSetup = setup({
  schemas: {
    input: types<SampleRequest>(),
    context: types<{ request: SampleRequest; frame: SampleFrame | null }>(),
    events: { sample: types<{ request: SampleRequest }>() },
  },
});

const samplePreview = previewSetup.createMachine({
  initial: 'idle',
  context: ({ input }) => ({ request: input, frame: null }),
  on: {
    sample: ({ context, event }) => ({
      target: '.loading', reenter: true, context: { ...context, request: event.request },
    }),
  },
  states: {
    idle: {},
    unavailable: {},
    loading: {
      invoke: previewSetup.createInvoke({
        src: galleryArtwork,
        input: ({ context }) => context.request,
        onDone: ({ context, event }) => Option.match(event.output, {
          onNone: () => ({ target: 'unavailable' }),
          onSome: (artwork) => ({ target: 'idle', context: { ...context, frame: { ...context.request, artwork } } }),
        }),
        onError: { target: 'unavailable' },
      }),
    },
  },
});

export function WidgetPreview({ layout, size }: { layout: WidgetLayout; size: WidgetSize }) {
  const { dashboard, language } = useDashboardContext();
  const { themeId, activity, widgetArtwork: live } = dashboard;
  const needsSample = activity?.kind !== 'ready';
  const [sample, send] = useActor(samplePreview, { input: { theme: themeId, language } });

  useLayoutEffect(() => {
    if (needsSample) send({ type: 'sample', request: { theme: themeId, language } });
  }, [language, needsSample, send, themeId]);

  const example = live ? null : sample.context.frame;
  const frame = live ?? example;
  const stats = live?.activity ?? (example ? sampleStats : null);
  const theme = themes[frame?.theme ?? themeId];
  const frameLanguage = frame?.language ?? language;
  const mood = dashboard.previewMood ?? (example ? 'happy' : live?.activity.mood ?? 'waiting');
  const drawable = mood === 'happy' ? theme.happyDrawable : theme.waitingDrawable;
  const card = stats && widgetCard(layout, frameLanguage, stats, theme.accent);
  const tallCurrent = stats && size === 'tall' && layout === 'current' ? currentTall(frameLanguage, stats, theme.accent) : undefined;
  const payload: WidgetProps = {
    artwork: frame ? { ...frame.artwork, portraitDrawable: drawable } : null,
    description: stats ? copy(frameLanguage, 'activityDescription', {
      name: theme.name, streak: stats.streak, today: stats.today, reviews: stats.dailyReviewed, learned: stats.dailyLearned,
    }) : '',
    waitingDrawable: drawable,
    backdrop: '#00000000',
    cardBackdrop: '#00000000',
    connectLabel: frame ? undefined : copy(language, needsSample && sample.matches('unavailable') ? 'previewUnavailable' : 'loadingPreview'),
    previewSize: size,
    cards: card ? { [size]: card } : undefined,
    tallCurrent,
  };
  const backdrop = widgetBackdrop(card || tallCurrent ? theme.card : '#000000', dashboard.transparency);

  return <YStack gap={7}>
    <YStack aspectRatio={1 / previewAspect[size]} bg="hero" justify="center" rounded={20} overflow="hidden">
      <YStack pointerEvents="none" position="absolute" t={0} r={0} b={0} l={0} bg={backdrop} />
      <NativePreview pointerEvents="none" style={StyleSheet.absoluteFill}
        widgetName="AnkiStreak" propsJson={JSON.stringify({ ...payload, revision: live?.revision })} />
    </YStack>
    {example && <Text color="muted" fontSize={12}>{copy(language, 'sampleData')}</Text>}
  </YStack>;
}
