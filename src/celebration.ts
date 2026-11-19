import type { AnkiActivity } from './activity';
import { copy } from './messages';
import { getLanguage, getTarget, milestones, preference, settings } from './preferences';

export function celebrationDay() {
  const date = new Date();
  if (date.getHours() < 4) date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function recordReviewMilestone(activity: AnkiActivity) {
  if (activity.kind !== 'ready' || activity.today === 0) return;
  const animate = settings.getPreference('animate') !== 'off';
  const notify = settings.getPreference('notifications') === 'on';
  if (!animate && !notify) return;

  const milestone = preference('milestone', milestones, 'firstReview');
  const reached = {
    firstReview: true,
    finishDue: activity.dueReviews === 0,
    reviewTarget: activity.today >= getTarget('reviewTarget'),
    newTarget: activity.newToday >= getTarget('newTarget'),
    streakTarget: activity.streak > 0 && activity.streak % getTarget('streakTarget') === 0,
  };
  if (!reached[milestone]) return;
  const language = getLanguage();
  settings.recordMilestone(
    celebrationDay(), animate, notify,
    copy(language, 'rewardToast'), copy(language, 'cheers'), copy(language, 'rewards'),
  );
}
