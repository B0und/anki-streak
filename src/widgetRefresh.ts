import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { requireNativeModule } from 'expo';
import { DateTime, Effect, Schedule, Schema, Semaphore } from 'effect';
import { createActor, createAsyncLogic, setup, types, waitFor } from 'xstate';

import './AnkiWidget';
import type { WidgetArtwork, WidgetProps } from './AnkiWidget';
import {
  getWidgetTheme, getWidgetBackgroundTransparency, readActivityEffect, renderWidget,
  setWidgetBackgroundTransparency, type AnkiActivity,
} from './activity';
import { copy } from './messages';
import { getLanguage, getWidgetLayouts } from './preferences';
import { recordReviewMilestone } from './celebration';
import { themes, type WidgetTheme } from './themes';
import { currentTall, widgetBackdrop, widgetCard } from './widgetDesign';

const taskName = 'refresh-anki-widget';
const backgroundIntervalMinutes = 15;
const appearanceDelayMs = 150;

type AvailableActivity = Exclude<AnkiActivity, { kind: 'unavailable' }>;
type ReadyActivity = Extract<AvailableActivity, { kind: 'ready' }>;
type PreparedArtwork = { artwork: WidgetArtwork; activity: ReadyActivity; theme: WidgetTheme; language: ReturnType<typeof getLanguage>; revision: number };
type ActivityCheck = { activity: AnkiActivity; checkedAt: number };

class WidgetFailure extends Schema.TaggedError<WidgetFailure>()('WidgetFailure', {
  stage: Schema.Literals(['artwork', 'publish']),
  cause: Schema.Defect(),
}) {}

const { publishSnapshot } = requireNativeModule<{
  publishSnapshot(name: string, props: string): Promise<void>;
}>('ExpoWidgets');

const publishing = Semaphore.makeUnsafe(1);

function snapshotProps(activity: AvailableActivity, artwork: PreparedArtwork | null, themeId: WidgetTheme): WidgetProps {
  const transparency = getWidgetBackgroundTransparency();
  const language = getLanguage();
  const ready = activity.kind === 'ready' ? activity : null;
  const layouts = getWidgetLayouts();
  const theme = ready ? themes[themeId] : null;
  const compact = ready && theme && widgetCard(layouts.compact, language, ready, theme.accent);
  const tall = ready && theme && widgetCard(layouts.tall, language, ready, theme.accent);
  return {
    artwork: artwork?.artwork ?? null,
    description: ready ? copy(language, 'activityDescription', {
      name: themes[themeId].name, streak: ready.streak, today: ready.today,
      reviews: ready.dailyReviewed, learned: ready.dailyLearned,
    }) : '',
    waitingDrawable: themes[themeId].waitingDrawable,
    backdrop: widgetBackdrop('#000000', transparency),
    cardBackdrop: widgetBackdrop(theme?.card ?? '#000000', transparency),
    connectLabel: copy(language, 'connectWidget'),
    cards: { ...(compact && { compact }), ...(tall && { tall }) },
    tallCurrent: ready && theme && layouts.tall === 'current' ? currentTall(language, ready, theme.accent) : undefined,
  };
}

const publishLatest = publishing.withPermit(
  Effect.gen(function*() {
    yield* Effect.yieldNow;
    while (true) {
      const { activity, artwork, revision } = widgetRefreshActor.getSnapshot().context;
      if (!activity || activity.kind === 'unavailable') return false;

      const theme = getWidgetTheme();
      const language = getLanguage();
      let prepared: PreparedArtwork | null = null;
      if (activity.kind === 'ready') {
        if (artwork?.activity === activity && artwork.theme === theme && artwork.language === language) {
          prepared = artwork;
        } else {
          const { streak, today, history, dailyReviewed, dailyLearned } = activity;
          const rendered = yield* Effect.tryPromise({
            try: () => renderWidget(streak, today, history, dailyReviewed, dailyLearned, theme, 'widget', language),
            catch: (cause) => new WidgetFailure({ stage: 'artwork', cause }),
          });
          prepared = { artwork: rendered, activity, theme, language, revision };
          widgetRefreshActor.send({ type: 'artworkPrepared', artwork: prepared });
        }
      }
      const latest = widgetRefreshActor.getSnapshot().context;
      if (latest.activity !== activity || getWidgetTheme() !== theme || getLanguage() !== language) continue;
      yield* Effect.tryPromise({
        try: () => publishSnapshot('AnkiStreak', JSON.stringify(snapshotProps(activity, prepared, theme))),
        catch: (cause) => new WidgetFailure({ stage: 'publish', cause }),
      });
      widgetRefreshActor.send({ type: 'widgetPublished' });
      return true;
    }
  }).pipe(
    Effect.retry({ times: 2, schedule: Schedule.spaced('400 millis') }),
    Effect.tapError((error) => Effect.logWarning('Widget refresh failed', error)),
  ),
);

const checkActivity = Effect.gen(function*() {
  const activity = yield* readActivityEffect;
  const checkedAt = DateTime.toEpochMillis(yield* DateTime.now);
  return { activity, checkedAt } satisfies ActivityCheck;
});

const publishRefresh = Effect.fnUntraced(function*(activity: AnkiActivity | undefined) {
  if (!activity || activity.kind === 'unavailable') return;
  yield* Effect.try(() => recordReviewMilestone(activity)).pipe(
    Effect.catch((error) => Effect.logWarning('Could not record milestone', error)),
  );
  yield* publishLatest;
});

const register = Effect.gen(function*() {
  if (!(yield* Effect.tryPromise(() => TaskManager.isTaskRegisteredAsync(taskName)))) {
    yield* Effect.tryPromise(() => BackgroundTask.registerTaskAsync(taskName, { minimumInterval: backgroundIntervalMinutes }));
  }
});

const refreshSetup = setup({
  schemas: {
    context: types<{
      check: ActivityCheck | null; activity: AnkiActivity | null; artwork: PreparedArtwork | null;
      revision: number; error: unknown; appearanceError: boolean; appearancePending: boolean; backgroundError: boolean;
    }>(),
    events: {
      refresh: types<void>(),
      scheduleAppearance: types<void>(),
      flushAppearance: types<void>(),
      widgetPublished: types<void>(),
      artworkPrepared: types<{ artwork: PreparedArtwork }>(),
      registerBackground: types<void>(),
    },
  },
});

const refreshMachine = refreshSetup.createMachine({
  id: 'widgetRefresh',
  type: 'parallel',
  context: { check: null, activity: null, artwork: null, revision: 0, error: null, appearanceError: false, appearancePending: false, backgroundError: false },
  on: {
    widgetPublished: ({ context }) => ({ context: { ...context, appearanceError: false } }),
    artworkPrepared: ({ context, event }) => {
      const { artwork } = event;
      if (context.activity === artwork.activity && getWidgetTheme() === artwork.theme && getLanguage() === artwork.language) {
        return { context: { ...context, artwork } };
      }
    },
  },
  states: {
    data: {
      initial: 'idle',
      states: {
        idle: { on: { refresh: { target: 'reading' } } },
        reading: {
          entry: ({ context }) => ({ context: { ...context, error: null } }),
          invoke: refreshSetup.createInvoke({
            src: ({ signal }): Promise<ActivityCheck> => Effect.runPromise(checkActivity, { signal }),
            onDone: ({ context, event }, enq) => {
              const check = event.output;
              if (check.activity.kind === 'ready') enq.raise({ type: 'registerBackground' });
              const transient = check.activity.kind === 'unavailable';
              const activity = transient && context.activity?.kind === 'ready' ? context.activity : check.activity;
              return {
                target: transient ? 'idle' : 'publishing',
                context: { ...context, check, activity, artwork: activity.kind === 'ready' ? context.artwork : null,
                  revision: context.revision + Number(activity !== context.activity) },
              };
            },
            onError: ({ context, event }) => ({ target: 'failed', context: { ...context, error: event.error } }),
          }),
        },
        publishing: {
          invoke: refreshSetup.createInvoke({
            schemas: { input: types<AnkiActivity | undefined>() },
            src: ({ input, signal }): Promise<void> => Effect.runPromise(publishRefresh(input), { signal }),
            input: ({ context }) => context.check?.activity,
            onDone: { target: 'idle' },
            onError: ({ context, event }) => ({ target: 'failed', context: { ...context, error: event.error } }),
          }),
        },
        failed: {
          on: {
            refresh: { target: 'reading' },
            widgetPublished: ({ context }) => ({
              target: 'idle', context: { ...context, appearanceError: false, error: null },
            }),
          },
        },
      },
    },
    appearance: {
      initial: 'quiet',
      states: {
        quiet: {
          on: {
            scheduleAppearance: { target: 'debouncing' },
            flushAppearance: { target: 'publishing' },
          },
        },
        debouncing: {
          on: {
            scheduleAppearance: { target: 'debouncing', reenter: true },
            flushAppearance: { target: 'publishing' },
          },
          after: { [appearanceDelayMs]: { target: 'publishing' } },
        },
        publishing: {
          entry: ({ context }) => ({ context: { ...context, appearancePending: false } }),
          invoke: refreshSetup.createInvoke({
            src: ({ signal }): Promise<boolean> => Effect.runPromise(publishLatest, { signal }),
            onDone: ({ context, event }) => ({
              target: context.appearancePending ? 'debouncing' : 'quiet',
              context: { ...context, appearanceError: !event.output && context.appearanceError },
            }),
            onError: ({ context }) => ({
              target: context.appearancePending ? 'debouncing' : 'quiet',
              context: { ...context, appearanceError: true },
            }),
          }),
          on: {
            scheduleAppearance: ({ context }) => ({ context: { ...context, appearancePending: true } }),
            flushAppearance: ({ context }) => ({ context: { ...context, appearancePending: true } }),
          },
        },
      },
    },
    background: {
      initial: 'idle',
      states: {
        idle: { on: { registerBackground: { target: 'registering' } } },
        registering: {
          invoke: refreshSetup.createInvoke({
            src: createAsyncLogic({ run: ({ signal }) => Effect.runPromise(register, { signal }) }),
            onDone: ({ context }) => ({ target: 'registered', context: { ...context, backgroundError: false } }),
            onError: ({ context }) => ({ target: 'idle', context: { ...context, backgroundError: true } }),
          }),
        },
        registered: {},
      },
    },
  },
});

export const widgetRefreshActor = createActor(refreshMachine).start();

export function republishWidgetAppearance() {
  widgetRefreshActor.send({ type: 'flushAppearance' });
}

export function changeWidgetBackgroundTransparency(value: number) {
  if (value === getWidgetBackgroundTransparency()) return;
  setWidgetBackgroundTransparency(value);
  widgetRefreshActor.send({ type: 'scheduleAppearance' });
}

export async function refreshWidget(): Promise<AnkiActivity> {
  widgetRefreshActor.send({ type: 'refresh' });
  const result = await waitFor(widgetRefreshActor, (snapshot) => !snapshot.matches({ data: 'reading' }) && !snapshot.matches({ data: 'publishing' }));
  if (result.matches({ data: 'failed' })) throw result.context.error;
  if (!result.context.check) throw new Error('Widget refresh completed without activity');
  return result.context.check.activity;
}

export async function refreshAfterPermissionRequest(): Promise<AnkiActivity> {
  await waitFor(widgetRefreshActor, (snapshot) => !snapshot.matches({ data: 'reading' }) && !snapshot.matches({ data: 'publishing' }));
  return refreshWidget();
}

TaskManager.defineTask(taskName, async () => {
  try {
    const activity = await refreshWidget();
    return activity.kind === 'unavailable'
      ? BackgroundTask.BackgroundTaskResult.Failed
      : BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
