import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import AnkiWidget, { type WidgetArtwork } from './AnkiWidget';
import {
  getWidgetTheme, getWidgetBackgroundTransparency, readActivity, renderWidget, setWidgetTheme, setWidgetBackgroundTransparency, type AnkiActivity,
} from './activity';
import { themes, type WidgetTheme } from './themes';

const taskName = 'refresh-anki-widget';
let inFlight: Promise<AnkiActivity> | undefined;
let content: { artwork: WidgetArtwork | null; description: string; waitingDrawable: string } | undefined;

function publishWidget() {
  if (content) {
    const alpha = Math.round(255 * (1 - getWidgetBackgroundTransparency() / 100)).toString(16).padStart(2, '0');
    AnkiWidget.updateSnapshot({ ...content, backdrop: `#000000${alpha}` });
  }
}

export function changeWidgetBackgroundTransparency(value: number) {
  if (value === getWidgetBackgroundTransparency()) return;
  setWidgetBackgroundTransparency(value);
  publishWidget();
}

export function changeWidgetTheme(theme: WidgetTheme): Promise<AnkiActivity> {
  setWidgetTheme(theme);
  return refreshWidget();
}

export function refreshWidget(): Promise<AnkiActivity> {
  inFlight ??= readActivity()
    .then(async (activity) => {
      let theme: WidgetTheme;
      do {
        theme = getWidgetTheme();
        const { name, waitingDrawable } = themes[theme];
        if (activity.kind === 'ready') {
          const { streak, today, history, dailyReviewed, dailyLearned } = activity;
          const artwork = await renderWidget(streak, today, history, dailyReviewed, dailyLearned, theme);
          const mood = today > 0 ? 'happy' : 'waiting';
          content = {
            artwork,
            description: `${name} is ${mood}. ${streak}-day streak. ${today} cards reviewed today. Daily averages: ${dailyReviewed} cards reviewed, ${dailyLearned} new cards learned.`,
            waitingDrawable,
          };
        } else {
          content = { artwork: null, description: '', waitingDrawable };
        }
      } while (theme !== getWidgetTheme());
      publishWidget();
      return activity;
    })
    .finally(() => {
      inFlight = undefined;
    });

  return inFlight;
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

export async function enableBackgroundRefresh() {
  if (!(await TaskManager.isTaskRegisteredAsync(taskName))) {
    await BackgroundTask.registerTaskAsync(taskName, { minimumInterval: 15 });
  }
}
