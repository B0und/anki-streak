import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { requireNativeModule } from 'expo';
import { DateTime, Effect, Schedule, Schema, Semaphore } from 'effect';
import { createActor, createAsyncLogic, setup, types, waitFor } from 'xstate';

import './AnkiWidget';
import {
  getWidgetTheme, getWidgetBackgroundTransparency, readActivityEffect, readCachedActivity,
  setWidgetBackgroundTransparency, type AnkiActivity,
} from './activity';
import { getLanguage, getQuestTargets, getWidgetLayouts } from './preferences';
import { recordReviewMilestone } from './celebration';
import { widgetProps } from './widgetDesign';

const taskName = 'refresh-anki-widget';
const backgroundIntervalMinutes = 15;
const appearanceDelayMs = 150;

type ActivityCheck = { activity: AnkiActivity; checkedAt: number };

class WidgetFailure extends Schema.TaggedError<WidgetFailure>()('WidgetFailure', {
  cause: Schema.Defect(),
}) {}

const { publishSnapshot } = requireNativeModule<{
  publishSnapshot(name: string, props: string): Promise<void>;
}>('ExpoWidgets');

const publishing = Semaphore.makeUnsafe(1);

const publishLatest = Effect.suspend(() => publishing.withPermit(
  Effect.gen(function*() {
    const { activity } = widgetRefreshActor.getSnapshot().context;
    if (!activity || activity.kind === 'unavailable') return false;
    const props = widgetProps({
      stats: activity.kind === 'ready' ? activity : null,
      themeId: getWidgetTheme(),
      language: getLanguage(),
      layouts: getWidgetLayouts(),
      transparency: getWidgetBackgroundTransparency(),
      targets: getQuestTargets(),
    });
    yield* Effect.tryPromise({
      try: () => publishSnapshot('AnkiStreak', JSON.stringify(props)),
      catch: (cause) => new WidgetFailure({ cause }),
    });
    widgetRefreshActor.send({ type: 'widgetPublished' });
    return true;
  }),
)).pipe(
  Effect.retry({ times: 2, schedule: Schedule.spaced('400 millis') }),
  Effect.tapError((error) => Effect.logWarning('Widget refresh failed', error)),
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
      check: ActivityCheck | null; activity: AnkiActivity | null;
      error: unknown; appearanceError: boolean; appearancePending: boolean; backgroundError: boolean;
    }>(),
    events: {
      refresh: types<void>(),
      scheduleAppearance: types<void>(),
      flushAppearance: types<void>(),
      widgetPublished: types<void>(),
      registerBackground: types<void>(),
    },
  },
});

const refreshMachine = refreshSetup.createMachine({
  id: 'widgetRefresh',
  type: 'parallel',
  context: () => ({
    check: null, activity: readCachedActivity(), error: null,
    appearanceError: false, appearancePending: false, backgroundError: false,
  }),
  on: {
    widgetPublished: ({ context }) => ({ context: { ...context, appearanceError: false } }),

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
                context: { ...context, check, activity },
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
