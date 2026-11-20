import type { ReviewHistory } from './activity';
import type { TallCurrent, WidgetCard } from './AnkiWidget';
import { copy, weekdays, type Language } from './messages';
import type { WidgetLayout } from './preferences';

export function widgetBackdrop(color: `#${string}`, transparency: number): `#${string}` {
  const alpha = Math.round(255 * (1 - transparency / 100)).toString(16).padStart(2, '0');
  return `${color}${alpha}`;
}

export function widgetCard(layout: WidgetLayout, language: Language, stats: { today: number; streak: number }, accent: string): WidgetCard | undefined {
  if (layout === 'current') return;
  const focus = layout === 'focus';
  const secondary = focus ? stats.streak : stats.today;
  return {
    value: String(focus ? stats.today : stats.streak),
    label: copy(language, focus ? 'reviewed' : 'streak'),
    secondary: `${copy(language, focus ? 'streak' : 'reviewed')}: ${secondary}`,
    shortLabel: copy(language, focus ? 'shortReviews' : 'shortStreak'),
    shortSecondary: `${copy(language, focus ? 'shortStreak' : 'shortReviews')}: ${secondary}`,
    accent,
  };
}

export function currentTall(language: Language, stats: { today: number; streak: number; history: ReviewHistory }, accent: `#${string}`): TallCurrent {
  const { counts, todayRow } = stats.history;
  const monday = counts.length - 1 - todayRow;
  return {
    value: String(stats.today),
    label: copy(language, 'reviewed'),
    streak: copy(language, 'widgetStreak', { count: stats.streak }),
    accent,
    days: weekdays[language].map((label, index) => {
      if (index > todayRow) {
        return { label, state: 'future' };
      }
      if (index === todayRow) {
        return { label, state: stats.today > 0 ? 'today-reviewed' : 'today' };
      }
      return { label, state: (counts[monday + index] ?? 0) > 0 ? 'reviewed' : 'missed' };
    }),
  };
}
