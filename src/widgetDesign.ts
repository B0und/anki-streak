import type { WidgetCard } from './AnkiWidget';
import { copy, type Language } from './messages';
import type { WidgetLayout } from './preferences';

export function widgetBackdrop(color: string, transparency: number) {
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
