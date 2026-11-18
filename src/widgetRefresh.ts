import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import AnkiWidget from './AnkiWidget';
import {
  getWidgetTransparency, readActivity, renderWidget, setWidgetTransparency, type AnkiActivity,
} from './activity';

const taskName = 'refresh-anki-widget';
let inFlight: Promise<AnkiActivity> | undefined;
let content: { imageUri: string; description: string } | undefined;

function publishWidget() {
  if (content) {
    AnkiWidget.updateSnapshot({ ...content, opacity: 1 - getWidgetTransparency() / 100 });
  }
}

export function changeWidgetTransparency(value: number) {
  if (value === getWidgetTransparency()) return;
  setWidgetTransparency(value);
  publishWidget();
}

export function refreshWidget(): Promise<AnkiActivity> {
  inFlight ??= readActivity()
    .then(async (activity) => {
      if (activity.kind === 'ready') {
        const { streak, today, history, dailyReviewed, dailyLearned } = activity;
        const imageUri = await renderWidget(streak, today, history, dailyReviewed, dailyLearned);
        const mood = today > 0 ? 'Miku is happy' : 'Miku is waiting';
        content = {
          imageUri,
          description: `${mood}. ${streak}-day streak. ${today} cards reviewed today. Daily averages: ${dailyReviewed} cards reviewed, ${dailyLearned} new cards learned.`,
        };
      } else {
        content = { imageUri: '', description: '' };
      }
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
