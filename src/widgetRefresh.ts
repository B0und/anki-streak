import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import AnkiWidget, { type WidgetArtwork } from './AnkiWidget';
import {
  getWidgetTheme, getWidgetBackgroundTransparency, readActivity, renderWidget, setWidgetTheme,
  setWidgetBackgroundTransparency, type AnkiActivity,
} from './activity';
import { copy } from './messages';
import { getLanguage, getWidgetLayouts, type WidgetLayout } from './preferences';
import { recordReviewMilestone } from './celebration';
import { themes, type WidgetTheme } from './themes';

const taskName = 'refresh-anki-widget';
const backgroundIntervalMinutes = 15;
const appearanceDelayMs = 150;

type Publication =
  | { kind: 'setup'; waitingDrawable: string }
  | { kind: 'reviews'; artwork: WidgetArtwork; activity: Extract<AnkiActivity, { kind: 'ready' }>; theme: WidgetTheme; waitingDrawable: string };

type CompletedRefresh = { activity: AnkiActivity; publication: Publication; checkedAt: number };

type RefreshState =
  | { kind: 'initial' }
  | { kind: 'reading'; previous: CompletedRefresh | null; work: Promise<AnkiActivity> }
  | { kind: 'rendering'; previous: CompletedRefresh | null; work: Promise<AnkiActivity>; theme: WidgetTheme }
  | { kind: 'settled'; result: CompletedRefresh }
  | { kind: 'failed'; previous: CompletedRefresh | null; error: unknown };

let state: RefreshState = { kind: 'initial' };
const listeners = new Set<() => void>();

export function subscribeToWidgetRefresh(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getWidgetRefreshState(): RefreshState {
  return state;
}

function transition(next: RefreshState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function lastCompletedRefresh(current: RefreshState): CompletedRefresh | null {
  switch (current.kind) {
    case 'initial':
      return null;
    case 'settled':
      return current.result;
    case 'reading':
    case 'rendering':
    case 'failed':
      return current.previous;
  }
}

function publish(publication: Publication) {
  const alpha = Math.round(255 * (1 - getWidgetBackgroundTransparency() / 100)).toString(16).padStart(2, '0');
  const language = getLanguage();
  const ready = publication.kind === 'reviews' ? publication : null;
  const layouts = getWidgetLayouts();
  const theme = ready ? themes[ready.theme] : null;
  const cardFor = (layout: WidgetLayout) => ready && theme && layout !== 'current' ? {
    value: String(layout === 'focus' ? ready.activity.today : ready.activity.streak),
    label: copy(language, layout === 'focus' ? 'reviewed' : 'streak'),
    secondary: layout === 'focus'
      ? `${copy(language, 'streak')}: ${ready.activity.streak}`
      : `${copy(language, 'reviewed')}: ${ready.activity.today}`,
    accent: theme.accent,
  } : null;
  const compact = cardFor(layouts.compact);
  const tall = cardFor(layouts.tall);
  AnkiWidget.updateSnapshot({
    artwork: ready?.artwork ?? null,
    description: ready ? copy(language, 'activityDescription', {
      name: themes[ready.theme].name, streak: ready.activity.streak, today: ready.activity.today,
      reviews: ready.activity.dailyReviewed, learned: ready.activity.dailyLearned,
    }) : '',
    waitingDrawable: publication.waitingDrawable,
    backdrop: `#000000${alpha}`,
    cardBackdrop: theme ? `${theme.card}${alpha}` : `#000000${alpha}`,
    connectLabel: copy(language, 'connectWidget'),
    cards: { ...(compact && { compact }), ...(tall && { tall }) },
  });
}

type AppearanceUpdate =
  | { kind: 'idle' }
  | { kind: 'scheduled'; timer: ReturnType<typeof setTimeout> }
  | { kind: 'waitingForRefresh' };

let appearance: AppearanceUpdate = { kind: 'idle' };

export function flushWidgetAppearance() {
  if (appearance.kind === 'idle') return;
  if (appearance.kind === 'scheduled') clearTimeout(appearance.timer);
  if (state.kind === 'reading' || state.kind === 'rendering') {
    appearance = { kind: 'waitingForRefresh' };
    return;
  }
  appearance = { kind: 'idle' };
  const last = lastCompletedRefresh(state);
  if (!last) return;
  try {
    publish(last.publication);
  } catch (error) {
    transition({ kind: 'failed', previous: last, error });
  }
}

export function republishWidgetAppearance() {
  if (appearance.kind === 'scheduled') clearTimeout(appearance.timer);
  appearance = { kind: 'waitingForRefresh' };
  flushWidgetAppearance();
}

export function changeWidgetBackgroundTransparency(value: number) {
  if (value === getWidgetBackgroundTransparency()) return;
  setWidgetBackgroundTransparency(value);
  if (appearance.kind === 'scheduled') clearTimeout(appearance.timer);
  appearance = { kind: 'scheduled', timer: setTimeout(flushWidgetAppearance, appearanceDelayMs) };
}

export function changeWidgetTheme(theme: WidgetTheme): Promise<AnkiActivity> {
  setWidgetTheme(theme);
  return refreshWidget();
}

async function preparePublication(activity: AnkiActivity, theme: WidgetTheme): Promise<Publication> {
  const { waitingDrawable } = themes[theme];
  if (activity.kind !== 'ready') return { kind: 'setup', waitingDrawable };

  const { streak, today, history, dailyReviewed, dailyLearned } = activity;
  const artwork = await renderWidget(streak, today, history, dailyReviewed, dailyLearned, theme);
  return {
    kind: 'reviews',
    artwork,
    activity, theme,
    waitingDrawable,
  };
}

export async function refreshAfterPermissionRequest(): Promise<AnkiActivity> {
  if (state.kind === 'reading' || state.kind === 'rendering') {
    try {
      await state.work;
    } catch {
      // The permission result needs a fresh read even if the earlier refresh failed.
    }
  }
  return refreshWidget();
}

export function refreshWidget(): Promise<AnkiActivity> {
  if (state.kind === 'reading' || state.kind === 'rendering') return state.work;

  const previous = lastCompletedRefresh(state);
  const work: Promise<AnkiActivity> = Promise.resolve().then(async () => {
    try {
      const activity = await readActivity();
      let theme: WidgetTheme;
      let publication: Publication;
      do {
        theme = getWidgetTheme();
        transition({ kind: 'rendering', previous, work, theme });
        publication = await preparePublication(activity, theme);
      } while (theme !== getWidgetTheme());

      publish(publication);
      if (appearance.kind === 'scheduled') clearTimeout(appearance.timer);
      appearance = { kind: 'idle' };
      try { recordReviewMilestone(activity); } catch { /* Celebration is optional. */ }
      transition({ kind: 'settled', result: { activity, publication, checkedAt: Date.now() } });
      return activity;
    } catch (error) {
      console.warn('AnkiDroid refresh failed', error);
      transition({ kind: 'failed', previous, error });
      if (appearance.kind === 'waitingForRefresh') flushWidgetAppearance();
      throw error;
    }
  });
  transition({ kind: 'reading', previous, work });
  return work;
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

type BackgroundRegistration =
  | { kind: 'unchecked' }
  | { kind: 'registering'; work: Promise<void> }
  | { kind: 'registered' };

let registration: BackgroundRegistration = { kind: 'unchecked' };

export function enableBackgroundRefresh(): Promise<void> {
  switch (registration.kind) {
    case 'registered':
      return Promise.resolve();
    case 'registering':
      return registration.work;
    case 'unchecked': {
      const work = (async () => {
        try {
          if (!(await TaskManager.isTaskRegisteredAsync(taskName))) {
            await BackgroundTask.registerTaskAsync(taskName, { minimumInterval: backgroundIntervalMinutes });
          }
          registration = { kind: 'registered' };
        } catch (error) {
          registration = { kind: 'unchecked' };
          throw error;
        }
      })();
      registration = { kind: 'registering', work };
      return work;
    }
  }
}
