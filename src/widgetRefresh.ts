import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { DateTime, Effect } from 'effect';
import { createActor, createAsyncLogic, setup, types, waitFor } from 'xstate';

import AnkiWidget, { type WidgetArtwork } from './AnkiWidget';
import {
  getWidgetTheme, getWidgetBackgroundTransparency, readActivityEffect, renderWidget,
  setWidgetBackgroundTransparency, type AnkiActivity,
} from './activity';
import { copy } from './messages';
import { getLanguage, getWidgetLayouts } from './preferences';
import { recordReviewMilestone } from './celebration';
import { themes, type WidgetTheme } from './themes';
import { widgetBackdrop, widgetCard } from './widgetDesign';

const taskName = 'refresh-anki-widget';
const backgroundIntervalMinutes = 15;
const appearanceDelayMs = 150;

type Publication =
  | { kind: 'setup'; waitingDrawable: string }
  | { kind: 'reviews'; artwork: WidgetArtwork; activity: Extract<AnkiActivity, { kind: 'ready' }>; theme: WidgetTheme; waitingDrawable: string };

type CompletedRefresh = { activity: AnkiActivity; publication: Publication; checkedAt: number };

function publish(publication: Publication) {
  const transparency = getWidgetBackgroundTransparency();
  const language = getLanguage();
  const ready = publication.kind === 'reviews' ? publication : null;
  const layouts = getWidgetLayouts();
  const theme = ready ? themes[ready.theme] : null;
  const compact = ready && theme && widgetCard(layouts.compact, language, ready.activity, theme.accent);
  const tall = ready && theme && widgetCard(layouts.tall, language, ready.activity, theme.accent);
  AnkiWidget.updateSnapshot({
    artwork: ready?.artwork ?? null,
    description: ready ? copy(language, 'activityDescription', {
      name: themes[ready.theme].name, streak: ready.activity.streak, today: ready.activity.today,
      reviews: ready.activity.dailyReviewed, learned: ready.activity.dailyLearned,
    }) : '',
    waitingDrawable: publication.waitingDrawable,
    backdrop: widgetBackdrop('#000000', transparency),
    cardBackdrop: widgetBackdrop(theme?.card ?? '#000000', transparency),
    connectLabel: copy(language, 'connectWidget'),
    cards: { ...(compact && { compact }), ...(tall && { tall }) },
  });
}

const preparePublication = Effect.fnUntraced(function*(activity: AnkiActivity, theme: WidgetTheme, language: ReturnType<typeof getLanguage>) {
  const { waitingDrawable } = themes[theme];
  if (activity.kind !== 'ready') return { kind: 'setup', waitingDrawable } satisfies Publication;
  const { streak, today, history, dailyReviewed, dailyLearned } = activity;
  const artwork = yield* Effect.tryPromise(() => renderWidget(streak, today, history, dailyReviewed, dailyLearned, theme, 'widget', language));
  return { kind: 'reviews', artwork, activity, theme, waitingDrawable } satisfies Publication;
});

const readAndPublish = Effect.gen(function*() {
  const activity = yield* readActivityEffect;
  let publication: Publication;
  let theme: WidgetTheme;
  let language: ReturnType<typeof getLanguage>;
  do {
    theme = getWidgetTheme();
    language = getLanguage();
    publication = yield* preparePublication(activity, theme, language);
  } while (theme !== getWidgetTheme() || language !== getLanguage());
  yield* Effect.try(() => publish(publication));
  yield* Effect.try(() => recordReviewMilestone(activity)).pipe(Effect.ignore);
  const checkedAt = DateTime.toEpochMillis(yield* DateTime.now);
  return { activity, publication, checkedAt } satisfies CompletedRefresh;
});

const register = Effect.gen(function*() {
  if (!(yield* Effect.tryPromise(() => TaskManager.isTaskRegisteredAsync(taskName)))) {
    yield* Effect.tryPromise(() => BackgroundTask.registerTaskAsync(taskName, { minimumInterval: backgroundIntervalMinutes }));
  }
});

const refreshSetup = setup({
  schemas: {
    context: types<{ completed: CompletedRefresh | null; error: unknown; backgroundError: boolean }>(),
    events: {
      refresh: types<void>(),
      scheduleAppearance: types<void>(),
      flushAppearance: types<void>(),
      registerBackground: types<void>(),
    },
  },
});

const refreshMachine = refreshSetup.createMachine({
  id: 'widgetRefresh',
  type: 'parallel',
  context: { completed: null, error: null, backgroundError: false },
  states: {
    data: {
      initial: 'idle',
      states: {
        idle: { on: { refresh: { target: 'reading' } } },
        reading: {
          entry: ({ context }) => ({ context: { ...context, error: null } }),
          invoke: refreshSetup.createInvoke({
            src: ({ signal }): Promise<CompletedRefresh> => Effect.runPromise(readAndPublish, { signal }),
            onDone: ({ context, event }, enq) => {
              if (event.output.activity.kind === 'ready') enq.raise({ type: 'registerBackground' });
              return { target: 'idle', context: { ...context, completed: event.output } };
            },
            onError: ({ context, event }, enq) => {
              enq.raise({ type: 'flushAppearance' });
              return { target: 'failed', context: { ...context, error: event.error } };
            },
          }),
        },
        failed: { on: { refresh: { target: 'reading' } } },
      },
    },
    appearance: {
      initial: 'quiet',
      states: {
        quiet: {
          on: {
            scheduleAppearance: { target: 'debouncing' },
            flushAppearance: (_, enq) => { enq(publishLatestAppearance); },
          },
        },
        debouncing: {
          on: {
            scheduleAppearance: { target: 'debouncing', reenter: true },
            flushAppearance: (_, enq) => {
              enq(publishLatestAppearance);
              return { target: 'quiet' };
            },
          },
          after: {
            [appearanceDelayMs]: (_, enq) => {
              enq(publishLatestAppearance);
              return { target: 'quiet' };
            },
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

function publishLatestAppearance() {
  const snapshot = widgetRefreshActor.getSnapshot();
  if (snapshot.matches({ data: 'reading' }) || !snapshot.context.completed) return;
  try {
    publish(snapshot.context.completed.publication);
  } catch (error) {
    console.warn('Could not publish widget appearance', error);
  }
}

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
  const result = await waitFor(widgetRefreshActor, (snapshot) => !snapshot.matches({ data: 'reading' }));
  if (result.matches({ data: 'failed' })) throw result.context.error;
  if (!result.context.completed) throw new Error('Widget refresh completed without activity');
  return result.context.completed.activity;
}

export async function refreshAfterPermissionRequest(): Promise<AnkiActivity> {
  await waitFor(widgetRefreshActor, (snapshot) => !snapshot.matches({ data: 'reading' }));
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
