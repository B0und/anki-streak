import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import AnkiWidget from './AnkiWidget';
import { readActivity, widgetActivity, type AnkiActivity } from './activity';

const taskName = 'refresh-anki-widget';
let inFlight: Promise<AnkiActivity> | undefined;

export function refreshWidget(): Promise<AnkiActivity> {
  inFlight ??= readActivity()
    .then((activity) => {
      AnkiWidget.updateSnapshot(widgetActivity(activity));
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
