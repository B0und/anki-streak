import { requireNativeModule } from 'expo';

type ReadyActivity = {
  kind: 'ready';
  today: number;
  streak: number;
  history: number[];
  due: number | null;
  newCards: number | null;
};

export type AnkiActivity =
  | ReadyActivity
  | { kind: 'permission' }
  | { kind: 'missing' }
  | { kind: 'unsupported' }
  | { kind: 'unavailable' };

const anki = requireNativeModule<{
  readActivity(): Promise<unknown>;
  renderWidget(
    streak: number | null,
    today: number | null,
    history: number[],
    due: number | null,
    newCards: number | null,
  ): Promise<string>;
  requestPermission(): Promise<unknown>;
  pinWidget(): Promise<boolean>;
  openAnki(): Promise<boolean>;
}>('AnkiActivity');

export const { pinWidget, openAnki, requestPermission, renderWidget } = anki;

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
          data.history.length === 102 && data.history.every(isCount) &&
          'due' in data && (data.due === null || isCount(data.due)) &&
          'newCards' in data && (data.newCards === null || isCount(data.newCards))
        ) {
          return {
            kind: 'ready', today: data.today, streak: data.streak, history: data.history,
            due: data.due, newCards: data.newCards,
          };
        }
        break;
    }
  } catch {
    return { kind: 'unavailable' };
  }

  return { kind: 'unavailable' };
}

