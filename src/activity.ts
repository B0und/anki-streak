import { Effect, Schema } from 'effect';
import { requireNativeModule } from 'expo';

import type { WidgetArtwork } from './AnkiWidget';
import { getLanguage } from './preferences';
import { themeOrder, type WidgetTheme } from './themes';

export type ReviewMood = 'waiting' | 'happy';

const anki = requireNativeModule<{
  readonly historyRows: number;
  readonly historyColumns: number;
  getWidgetTheme(): unknown;
  setWidgetTheme(theme: WidgetTheme): void;
  getWidgetBackgroundTransparency(): number;
  setWidgetBackgroundTransparency(value: number): void;
  readActivity(): Promise<unknown>;
  readDecks(): Promise<unknown>;
  getDueReviewExcludedDecks(): string[];
  setDueReviewExcludedDecks(ids: readonly string[]): void;
  renderWidget(
    streak: number,
    today: number,
    history: ReviewHistory,
    dailyReviewed: number,
    dailyLearned: number,
    theme: WidgetTheme,
    purpose: 'widget' | 'preview',
    language: 'en' | 'ru',
  ): Promise<WidgetArtwork>;
  requestPermission(): Promise<unknown>;
  pinWidget(): Promise<'requested' | 'use-picker'>;
  openAnki(): Promise<'opened' | 'missing'>;
}>('AnkiActivity');

export const {
  pinWidget, openAnki, getWidgetBackgroundTransparency, setWidgetBackgroundTransparency, setWidgetTheme,
  getDueReviewExcludedDecks, setDueReviewExcludedDecks,
} = anki;
export const historyRows: number = anki.historyRows;
export const historyColumns: number = anki.historyColumns;
export const historyDays = historyRows * historyColumns;

const Decks = Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String }));
export type AnkiDeck = (typeof Decks.Type)[number];
export const readDecks = Effect.tryPromise(() => anki.readDecks()).pipe(
  Effect.flatMap(Schema.decodeUnknownEffect(Decks)),
  Effect.map((decks) => [...decks].sort((left, right) => left.name.localeCompare(right.name))),
);

export const requestAnkiPermission = Effect.tryPromise(() => anki.requestPermission()).pipe(
  Effect.flatMap(Schema.decodeUnknownEffect(Schema.Struct({ granted: Schema.Boolean, canAskAgain: Schema.Boolean }))),
);

export function renderWidget(
  streak: number, today: number, history: ReviewHistory, dailyReviewed: number, dailyLearned: number,
  theme: WidgetTheme, purpose: 'widget' | 'preview' = 'widget', language = getLanguage(),
) {
  return anki.renderWidget(streak, today, history, dailyReviewed, dailyLearned, theme, purpose, language);
}

export function getWidgetTheme(): WidgetTheme {
  const id = anki.getWidgetTheme();
  return themeOrder.find((theme) => theme === id) ?? 'miku';
}

const count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0), Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER));
const reviewHistory = Schema.Struct({
  counts: Schema.Array(count).check(Schema.isMinLength(historyDays), Schema.isMaxLength(historyDays)),
  todayRow: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0), Schema.isLessThan(historyRows)),
});
export type ReviewHistory = typeof reviewHistory.Type;

const providerActivity = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal('ready'),
    today: count,
    newToday: count,
    dueReviews: count,
    streak: count,
    history: reviewHistory,
    dailyReviewed: count,
    dailyLearned: count,
  }),
  Schema.Struct({ kind: Schema.Literals(['permission', 'missing', 'unsupported']) }),
]);
type ProviderActivity = typeof providerActivity.Type;
export type AnkiActivity = (Extract<ProviderActivity, { kind: 'ready' }> & { mood: ReviewMood })
  | Exclude<ProviderActivity, { kind: 'ready' }>
  | { kind: 'unavailable' };

export const readActivityEffect = Effect.tryPromise(() => anki.readActivity()).pipe(
  Effect.flatMap(Schema.decodeUnknownEffect(providerActivity)),
  Effect.map((data): AnkiActivity => data.kind === 'ready'
    ? { ...data, mood: data.today > 0 ? 'happy' : 'waiting' }
    : data),
  Effect.catch((error) => Effect.logWarning('AnkiDroid activity unavailable', error).pipe(
    Effect.as<AnkiActivity>({ kind: 'unavailable' }),
  )),
);
