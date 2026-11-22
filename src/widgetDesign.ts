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
  layout: WidgetLayout, language: Language, stats: WidgetStats, theme: (typeof themes)[WidgetTheme],
  targets: ReturnType<typeof getQuestTargets>, transparency: number,
): WidgetCard {
  const { accent } = theme;
  if (layout === 'studyPulse') {
    return {
      value: String(stats.today),
      label: copy(language, 'pulseToday'),
      secondary: '',
      accent,
      pulse: {
        shade: widgetBackdrop(theme.widgetShade, transparency),
        muted: theme.widgetMuted,
        metrics: [
          { label: copy(language, 'pulseStreak'), value: String(stats.streak), icon: 'widget_pulse_streak' },
          { label: copy(language, 'pulseReviews'), value: String(stats.dailyReviewed), icon: 'widget_pulse_reviews' },
          { label: copy(language, 'pulseNew'), value: String(stats.dailyLearned), icon: 'widget_pulse_new' },
        ],
      },
    };
  }
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
  const backdrop = widgetBackdrop(stats ? theme.card : theme.widgetShade, transparency);
  return {
    happy: !!stats && stats.today > 0,
    portraitAspect: theme.portraitAspect,
    description: stats ? copy(language, 'activityDescription', {
      name: theme.name, streak: stats.streak, today: stats.today,
      reviews: stats.dailyReviewed, learned: stats.dailyLearned,
    }) : '',
    waitingDrawable: theme.waiting,
    happyDrawable: theme.happy,
    backdrop,
    cardBackdrop: backdrop,
    connectLabel: copy(language, 'connectWidget'),
    cards: stats ? {
      compact: widgetCard(layouts.compact, language, stats, theme, targets, transparency),
      tall: { ...widgetCard(layouts.tall, language, stats, theme, targets, transparency),
        days: layouts.tall === 'current' ? widgetWeek(language, stats) : undefined },
    } : undefined,
  };
}
