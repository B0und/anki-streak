import type { ReviewHistory } from './activity';
import type { TallCurrent, WidgetArtwork, WidgetCard, WidgetProps } from './AnkiWidget';
import { copy, weekdays, type Language } from './messages';
import type { WidgetLayout, WidgetSize } from './preferences';
import { themes, type WidgetTheme } from './themes';

function widgetBackdrop(color: `#${string}`, transparency: number): `#${string}` {
  const alpha = Math.round(255 * (1 - transparency / 100)).toString(16).padStart(2, '0');
  return `${color}${alpha}`;
}

function widgetCard(layout: WidgetLayout, language: Language, stats: { today: number; streak: number }, accent: string): WidgetCard | undefined {
  if (layout === 'current') return;
  const focus = layout === 'focus';
  const secondary = focus ? stats.streak : stats.today;
  return {
    value: String(focus ? stats.today : stats.streak),
    label: copy(language, focus ? 'reviewed' : 'streak'),
    secondary: focus ? copy(language, 'widgetStreak', { count: secondary }) : `${copy(language, 'reviewed')}: ${secondary}`,
    shortLabel: copy(language, focus ? 'shortReviews' : 'shortStreak'),
    shortSecondary: `${copy(language, focus ? 'shortStreak' : 'shortReviews')}: ${secondary}`,
    accent,
  };
}

function currentTall(language: Language, stats: { today: number; streak: number; history: ReviewHistory }, accent: `#${string}`): TallCurrent {
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

type WidgetStats = { today: number; streak: number; history: ReviewHistory; dailyReviewed: number; dailyLearned: number };

export function widgetProps({ artwork, stats, language, themeId, layouts, transparency }: {
  artwork: WidgetArtwork | null;
  stats: WidgetStats | null;
  language: Language;
  themeId: WidgetTheme;
  layouts: Record<WidgetSize, WidgetLayout>;
  transparency: number;
}): WidgetProps {
  const theme = themes[themeId];
  return {
    artwork,
    description: stats ? copy(language, 'activityDescription', {
      name: theme.name, streak: stats.streak, today: stats.today,
      reviews: stats.dailyReviewed, learned: stats.dailyLearned,
    }) : '',
    waitingDrawable: theme.waitingDrawable,
    happyDrawable: theme.happyDrawable,
    backdrop: widgetBackdrop('#000000', transparency),
    cardBackdrop: widgetBackdrop(stats ? theme.card : '#000000', transparency),
    connectLabel: copy(language, 'connectWidget'),
    cards: stats ? {
      compact: widgetCard(layouts.compact, language, stats, theme.accent),
      tall: widgetCard(layouts.tall, language, stats, theme.accent),
    } : undefined,
    tallCurrent: stats && layouts.tall === 'current' ? currentTall(language, stats, theme.accent) : undefined,
  };
}
