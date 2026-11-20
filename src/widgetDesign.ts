import type { ReviewHistory } from './activity';
import type { WidgetCard, WidgetProps } from './AnkiWidget';
import { copy, weekdays, type Language } from './messages';
import type { WidgetLayout, WidgetSize } from './preferences';
import { themes, type WidgetTheme } from './themes';

function widgetBackdrop(color: `#${string}`, transparency: number): `#${string}` {
  const alpha = Math.round(255 * (1 - transparency / 100)).toString(16).padStart(2, '0');
  return `${color}${alpha}`;
}

function widgetCard(layout: WidgetLayout, language: Language, stats: WidgetStats, accent: `#${string}`): WidgetCard {
  const focus = layout !== 'first';
  const secondary = focus ? stats.streak : stats.today;
  return {
    value: String(focus ? stats.today : stats.streak),
    label: copy(language, focus ? 'reviewed' : 'streak'),
    secondary: focus ? copy(language, 'widgetStreak', { count: secondary }) : `${copy(language, 'shortReviews')}: ${secondary}`,
    shortLabel: copy(language, focus ? 'shortReviews' : 'shortStreak'),
    averages: layout === 'current' ? copy(language, 'widgetAverages', { reviews: stats.dailyReviewed, learned: stats.dailyLearned }) : undefined,
    shortSecondary: `${copy(language, focus ? 'shortStreak' : 'shortReviews')}: ${secondary}`,
    accent,
  };
}

function widgetWeek(language: Language, stats: { today: number; history: ReviewHistory }): NonNullable<WidgetCard["days"]> {
  const { counts, todayRow } = stats.history;
  const monday = counts.length - 1 - todayRow;
  return weekdays[language].map((label, index) => {
    if (index > todayRow) {
      return { label, state: 'future' };
    }
    if (index === todayRow) {
      return { label, state: stats.today > 0 ? 'today-reviewed' : 'today' };
    }
    return { label, state: (counts[monday + index] ?? 0) > 0 ? 'reviewed' : 'missed' };
  });
}

type WidgetStats = { today: number; streak: number; history: ReviewHistory; dailyReviewed: number; dailyLearned: number };

export function widgetProps({ stats, language, themeId, layouts, transparency }: {
  stats: WidgetStats | null;
  language: Language;
  themeId: WidgetTheme;
  layouts: Record<WidgetSize, WidgetLayout>;
  transparency: number;
}): WidgetProps {
  const theme = themes[themeId];
  return {
    happy: !!stats && stats.today > 0,
    portraitAspect: theme.portraitAspect,
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
      tall: { ...widgetCard(layouts.tall, language, stats, theme.accent),
        days: layouts.tall === 'current' ? widgetWeek(language, stats) : undefined },
    } : undefined,
  };
}
