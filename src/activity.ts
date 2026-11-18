import { requireNativeModule } from 'expo';

type ReadyActivity = {
  kind: 'ready';
  today: number;
  streak: number;
  history: number[];
};

export type AnkiActivity =
  | ReadyActivity
  | { kind: 'permission' }
  | { kind: 'missing' }
  | { kind: 'unsupported' }
  | { kind: 'unavailable' };

export type WidgetActivity = {
  mood: 'waiting' | 'happy' | 'unlinked';
  streak: number;
  today: number;
  history: number[];
};

const anki = requireNativeModule<{
  readActivity(): Promise<unknown>;
  requestPermission(): Promise<unknown>;
  pinWidget(): Promise<boolean>;
  openAnki(): Promise<boolean>;
}>('AnkiActivity');

export const { pinWidget, openAnki, requestPermission } = anki;

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export async function readActivity(): Promise<AnkiActivity> {
  try {
    const data = await anki.readActivity();
    if (typeof data !== 'object' || data === null || !('kind' in data)) {
      return { kind: 'unavailable' };
    }

    switch (data.kind) {
      case 'missing':
      case 'permission':
      case 'unsupported':
        return { kind: data.kind };
      case 'ready':
        if (
          'today' in data && isCount(data.today) &&
          'streak' in data && isCount(data.streak) &&
          'history' in data && Array.isArray(data.history) &&
          data.history.length === 45 && data.history.every(isCount)
        ) {
          return { kind: 'ready', today: data.today, streak: data.streak, history: data.history };
        }
        break;
    }
  } catch {
    return { kind: 'unavailable' };
  }

  return { kind: 'unavailable' };
}

export function widgetActivity(activity: AnkiActivity): WidgetActivity {
  if (activity.kind !== 'ready') {
    return { mood: 'unlinked', streak: 0, today: 0, history: [] };
  }

  return {
    mood: activity.today > 0 ? 'happy' : 'waiting',
    streak: activity.streak,
    today: activity.today,
    history: activity.history,
  };
}
