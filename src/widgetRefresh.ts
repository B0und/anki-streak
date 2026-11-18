import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import AnkiWidget from './AnkiWidget';
import { readActivity, renderWidget, type AnkiActivity } from './activity';

const taskName = 'refresh-anki-widget';
let inFlight: Promise<AnkiActivity> | undefined;

export function refreshWidget(): Promise<AnkiActivity> {
  inFlight ??= readActivity()
    .then(async (activity) => {
      if (activity.kind === 'ready') {
        const { streak, today, history, due, newCards } = activity;
        const imageUri = await renderWidget(streak, today, history, due, newCards);
        const mood = today > 0 ? 'Miku is happy' : 'Miku is waiting';
        const dueLabel = due === null ? 'Due count unavailable' : `${due} due`;
        const newLabel = newCards === null ? 'New count unavailable' : `${newCards} new`;
        AnkiWidget.updateSnapshot({
          imageUri,
          description: `${mood}. ${streak}-day streak. ${today} cards reviewed today. ${dueLabel}. ${newLabel}.`,
        });
      } else {
        AnkiWidget.updateSnapshot({ imageUri: '', description: '' });
      }
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
