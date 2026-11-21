import { Effect, Option, Schema } from 'effect';
import { requireNativeModule } from 'expo';

import { settings } from './preferences';
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

const readyActivity = Schema.Struct({
  kind: Schema.Literal('ready'),
  today: count,
  newToday: count,
  dueReviews: count,
  streak: count,
  history: reviewHistory,
  dailyReviewed: count,
  dailyLearned: count,
});
const providerActivity = Schema.Union([
  readyActivity,
  Schema.Struct({ kind: Schema.Literals(['permission', 'missing', 'unsupported']) }),
]);
type ProviderActivity = typeof providerActivity.Type;
export type AnkiActivity = (Extract<ProviderActivity, { kind: 'ready' }> & { mood: ReviewMood })
  | Exclude<ProviderActivity, { kind: 'ready' }>
  | { kind: 'unavailable' };

const activityPreference = 'last-review-activity';
const decodeSnapshot = Schema.decodeUnknownOption(Schema.fromJsonString(readyActivity));

function withMood(data: typeof readyActivity.Type): Extract<AnkiActivity, { kind: 'ready' }> {
  return { ...data, mood: data.today > 0 ? 'happy' : 'waiting' };
}

export function readCachedActivity() {
  const snapshot = decodeSnapshot(settings.getPreference(activityPreference));
  return Option.isSome(snapshot) ? withMood(snapshot.value) : null;
}

function cacheActivity(data: ProviderActivity) {
  settings.setPreference(activityPreference, data.kind === 'ready' ? JSON.stringify(data) : '');
}

export const readActivityEffect = Effect.tryPromise(() => anki.readActivity()).pipe(
  Effect.flatMap(Schema.decodeUnknownEffect(providerActivity)),
  Effect.tap((data) => Effect.try(() => cacheActivity(data)).pipe(
    Effect.catch((error) => Effect.logWarning('Could not save review activity', error)),
  )),
  Effect.map((data): AnkiActivity => data.kind === 'ready' ? withMood(data) : data),
  Effect.catch((error) => Effect.logWarning('AnkiDroid activity unavailable', error).pipe(
    Effect.as<AnkiActivity>({ kind: 'unavailable' }),
  )),
);
