import type { ReviewHistory } from './activity';
import type { WidgetCard, WidgetProps } from './AnkiWidget';
import { copy, weekdays, type Language } from './messages';
import type { getQuestTargets, WidgetLayout, WidgetSize } from './preferences';
import { dailyQuests, type StudyActivity } from './studyProgress';
import { themes, type WidgetTheme } from './themes';

function widgetBackdrop(color: `#${string}`, transparency: number): `#${string}` {
  const alpha = Math.round(255 * (1 - transparency / 100)).toString(16).padStart(2, '0');
  return `${color}${alpha}`;
}

function widgetCard(
  layout: WidgetLayout, language: Language, stats: WidgetStats, accent: `#${string}`,
  targets: ReturnType<typeof getQuestTargets>,
): WidgetCard {
  if (layout === 'dailyQuests') {
    const quests = dailyQuests(stats, targets);
    const completed = quests.filter(({ value, target }) => value >= target).length;
    const goals = quests.flatMap(({ id, value, target }) => {
      if (id !== 'reviewTarget' && id !== 'newTarget') return [];
      return [{
        label: copy(language, id === 'reviewTarget' ? 'shortReviews' : 'newCards'),
        value: `${Math.min(value, target)}/${target}`,
        fraction: Math.min(1, value / target),
      }];
    });
    return {
      value: `${completed}/${quests.length}`,
      label: copy(language, 'widgetDailyQuests'),
      secondary: '',
      accent,
      quests: { completed, total: quests.length, goals },
    };
  }
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

type WidgetStats = Pick<StudyActivity, 'today' | 'newToday' | 'dueReviews' | 'streak' | 'history' | 'dailyReviewed' | 'dailyLearned'>;

export function widgetProps({ stats, language, themeId, layouts, transparency, targets }: {
  stats: WidgetStats | null;
  language: Language;
  themeId: WidgetTheme;
  layouts: Record<WidgetSize, WidgetLayout>;
  transparency: number;
  targets: ReturnType<typeof getQuestTargets>;
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
      compact: widgetCard(layouts.compact, language, stats, theme.accent, targets),
      tall: { ...widgetCard(layouts.tall, language, stats, theme.accent, targets),
        days: layouts.tall === 'current' ? widgetWeek(language, stats) : undefined },
    } : undefined,
  };
}
