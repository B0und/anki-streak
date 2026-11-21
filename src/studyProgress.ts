import type { AnkiActivity } from './activity';
import type { Message } from './messages';

export type StudyActivity = Extract<AnkiActivity, { kind: 'ready' }>;

export const achievements = [
  { id: 'firstReview', title: 'firstReviewAward', detail: 'firstReviewAwardDetail' },
  { id: 'clearQueue', title: 'clearQueueAward', detail: 'clearQueueAwardDetail' },
  { id: 'weekStreak', title: 'weekStreakAward', detail: 'weekStreakAwardDetail' },
  { id: 'monthStreak', title: 'monthStreakAward', detail: 'monthStreakAwardDetail' },
] as const satisfies readonly { id: string; title: Message; detail: Message }[];

export type Achievement = (typeof achievements)[number]['id'];

export function readEarned(value: string | null): Achievement[] {
  const stored = new Set(value?.split(','));
  return achievements.flatMap(({ id }) => stored.has(id) ? [id] : []);
}

export function dailyQuests(activity: StudyActivity | null, targets: { reviews: number; newCards: number }) {
  return [
    { id: 'firstReview', title: 'firstReview', value: activity?.today ? 1 : 0, target: 1 },
    { id: 'reviewTarget', title: 'questReviews', value: activity?.today ?? 0, target: targets.reviews },
    { id: 'newTarget', title: 'questNew', value: activity?.newToday ?? 0, target: targets.newCards },
    { id: 'finishDue', title: 'questDue', value: activity?.today && activity.dueReviews === 0 ? 1 : 0, target: 1 },
  ] as const;
}

export function newlyEarned(activity: StudyActivity, earned: readonly Achievement[]) {
  let consecutive = 0;
  let longest = activity.streak;
  let hasReviews = activity.today > 0;
  for (const count of activity.history.counts) {
    if (count > 0) hasReviews = true;
    consecutive = count > 0 ? consecutive + 1 : 0;
    longest = Math.max(consecutive, longest);
  }
  const reached = {
    firstReview: hasReviews,
    clearQueue: activity.today > 0 && activity.dueReviews === 0,
    weekStreak: longest >= 7,
    monthStreak: longest >= 30,
  } satisfies Record<Achievement, boolean>;
  return achievements.flatMap(({ id }) => reached[id] && !earned.includes(id) ? [id] : []);
}
