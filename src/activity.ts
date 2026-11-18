import { requireNativeModule } from 'expo';

type ReadyActivity = {
  kind: 'ready';
  today: number;
  streak: number;
  history: number[];
  dailyReviewed: number;
  dailyLearned: number;
};

export type AnkiActivity =
  | ReadyActivity
  | { kind: 'permission' }
  | { kind: 'missing' }
  | { kind: 'unsupported' }
  | { kind: 'unavailable' };

const anki = requireNativeModule<{
  getWidgetTransparency(): number;
  setWidgetTransparency(value: number): void;
  readActivity(): Promise<unknown>;
  renderWidget(
    streak: number,
    today: number,
    history: number[],
    dailyReviewed: number,
    dailyLearned: number,
  ): Promise<string>;
  requestPermission(): Promise<unknown>;
  pinWidget(): Promise<boolean>;
  openAnki(): Promise<boolean>;
}>('AnkiActivity');

export const {
  pinWidget, openAnki, requestPermission, renderWidget, getWidgetTransparency, setWidgetTransparency,
} = anki;

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
          'dailyReviewed' in data && isCount(data.dailyReviewed) &&
          'dailyLearned' in data && isCount(data.dailyLearned)
        ) {
          return {
            kind: 'ready', today: data.today, streak: data.streak, history: data.history,
            dailyReviewed: data.dailyReviewed, dailyLearned: data.dailyLearned,
          };
        }
        break;
    }
  } catch {
    return { kind: 'unavailable' };
  }

  return { kind: 'unavailable' };
}

