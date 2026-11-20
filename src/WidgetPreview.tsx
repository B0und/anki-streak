import { createEffectActor, createEffectLogic, join } from '@xstate/effect';
import { useActor } from '@xstate/react';
import { Effect, Option, Schema } from 'effect';
import { requireNativeView } from 'expo';
import { useLayoutEffect } from 'react';
import { ScrollView, StyleSheet, type ViewProps } from 'react-native';
import { Text, YStack } from 'tamagui';
import { createAsyncLogic, setup, types } from 'xstate';

import { historyDays, historyRows, renderWidget } from './activity';
import type { WidgetArtwork } from './AnkiWidget';
import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import { Choices } from './studyComponents';
import { widgetProps } from './widgetDesign';
import { previewBounds, type WidgetPreviewSize } from './widgetSizeActor';

const NativePreview = requireNativeView<ViewProps & {
  widgetName: string;
  sampleProps: string;
  widthDp: number;
  heightDp: number;
  previewMood: 'live' | 'waiting' | 'happy';
}>('ExpoWidgets', 'WidgetPreviewView');
const compactPreviewMaxHeight = 144;
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

function dimensionsKey({ width, height }: WidgetPreviewSize) {
  return `${width} × ${height}`;
}

export function WidgetPreview({ sizes, selected, onSelect }: {
  sizes: readonly WidgetPreviewSize[]; selected: number | null; onSelect(widgetId: number): void;
}) {
  const { dashboard, language, layouts } = useDashboardContext();
  const { themeId, activity, transparency } = dashboard;
  const bounds = previewBounds(sizes, selected);
  const needsSample = !!bounds && bounds.widgetId === undefined && activity?.kind !== 'ready';
  const [sample, send] = useActor(samplePreview, { input: { theme: themeId, language } });

  useLayoutEffect(() => {
    if (needsSample) send({ type: 'sample', request: { theme: themeId, language } });
  }, [language, needsSample, send, themeId]);

  if (!bounds) return null;
  const frame = needsSample ? sample.context.frame : null;
  const sampleProps = frame ? JSON.stringify(widgetProps({
    artwork: frame.artwork,
    stats: sampleStats,
    language: frame.language,
    themeId: frame.theme,
    layouts,
    transparency,
  })) : '';
  const width = bounds.width;
  const height = bounds.height;
  const previewScale = bounds.size === 'compact' ? Math.min(1, compactPreviewMaxHeight / height) : 1;
  const dimensions = new Map(sizes.map((candidate) => [dimensionsKey(candidate), candidate]));
  dimensions.set(dimensionsKey(bounds), bounds);
  const sizeLabels = new Map([...dimensions.values()].map((candidate) => [
    String(candidate.widgetId), `${Math.round(candidate.width)} × ${Math.round(candidate.height)}`,
  ]));

  return <YStack gap={7}>
    {sizeLabels.size > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Choices choices={[...sizeLabels.keys()]} value={String(bounds.widgetId)} onChange={(key) => onSelect(Number(key))}
        label={(key) => sizeLabels.get(key) ?? key} />
    </ScrollView>}
    <YStack w="100%" maxW={width * previewScale} self="center">
      <YStack w="100%" aspectRatio={width / height} bg="hero" rounded={20 * previewScale} overflow="hidden">
        <NativePreview pointerEvents="none" style={StyleSheet.absoluteFill} widgetName="AnkiStreak"
          sampleProps={sampleProps} previewMood={dashboard.previewMood ?? 'live'} widthDp={width} heightDp={height} />
      </YStack>
    </YStack>
    {frame && <Text color="muted" fontSize={12}>{copy(language, 'sampleData')}</Text>}
    {!frame && bounds.widgetId === undefined && <Text color="muted" fontSize={12}>{copy(language, 'exampleWidgetSize')}</Text>}
    {needsSample && !frame && sample.matches('unavailable') && <Text color="muted" fontSize={12}>{copy(language, 'previewUnavailable')}</Text>}
  </YStack>;
}
