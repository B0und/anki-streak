import { requireNativeModule } from 'expo';

import type { WidgetArtwork } from './AnkiWidget';
import { themeOrder, type WidgetTheme } from './themes';

export type ReviewMood = 'waiting' | 'happy';

type ReadyActivity = {
  kind: 'ready';
  today: number;
  mood: ReviewMood;
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
  readonly historyDays: number;
  getWidgetTheme(): unknown;
  setWidgetTheme(theme: WidgetTheme): void;
  getWidgetBackgroundTransparency(): number;
  setWidgetBackgroundTransparency(value: number): void;
  readActivity(): Promise<unknown>;
  renderWidget(
    streak: number,
    today: number,
    history: number[],
    dailyReviewed: number,
    dailyLearned: number,
    theme: WidgetTheme,
  ): Promise<WidgetArtwork>;
  requestPermission(): Promise<unknown>;
  pinWidget(): Promise<'requested' | 'use-picker'>;
  openAnki(): Promise<'opened' | 'missing'>;
}>('AnkiActivity');

export const {
  pinWidget, openAnki, requestPermission, renderWidget, getWidgetBackgroundTransparency, setWidgetBackgroundTransparency, setWidgetTheme,
} = anki;

export function getWidgetTheme(): WidgetTheme {
  const id = anki.getWidgetTheme();
  return themeOrder.find((theme) => theme === id) ?? 'miku';
}

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
          data.history.length === anki.historyDays && data.history.every(isCount) &&
          'dailyReviewed' in data && isCount(data.dailyReviewed) &&
          'dailyLearned' in data && isCount(data.dailyLearned)
        ) {
          return {
            kind: 'ready', today: data.today, mood: data.today > 0 ? 'happy' : 'waiting', streak: data.streak, history: data.history,
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

