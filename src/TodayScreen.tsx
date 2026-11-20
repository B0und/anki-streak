import { useWindowDimensions } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { historyColumns, historyRows, type ReviewHistory } from './activity';
import type { Palette } from './appearance';
import { copy, type Language } from './messages';
import { Action, CountUp, Portrait, Section } from './studyComponents';
import { themes } from './themes';
import type { useDashboard } from './useDashboard';

const weekdays = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
};

export function TodayScreen({ dashboard, palette, language, celebration }: {
  dashboard: ReturnType<typeof useDashboard>; palette: Palette; language: Language; celebration: number;
}) {
  const { width } = useWindowDimensions();
  const { activity, themeId } = dashboard;
  const ready = activity?.kind === 'ready' ? activity : null;
  const portrait = themes[themeId][ready?.mood ?? 'waiting'];
  return <>
    <YStack minH={208} rounded={22} bg="hero" overflow="hidden" justify="center">
      <Portrait source={portrait} height={198} maxWidth={Math.min(width * .47, 240)} />
      <YStack w="53%" px={18} py={20} gap={4}>
        <Text color="color" fontFamily="display" fontWeight="700" fontSize={68} letterSpacing={-2}
          fontVariant={['tabular-nums']} style={{ includeFontPadding: false }} adjustsFontSizeToFit numberOfLines={1}>
          <CountUp value={ready?.streak} delay={0} celebration={celebration} />
        </Text>
        <Text color="color" fontWeight="700" fontSize={17}>{copy(language, 'streak')}</Text>
        {ready && <Text color="color" fontSize={13}>
          {copy(language, celebration ? 'rewardToast' : ready.today ? 'cheers' : 'waiting')}
        </Text>}
      </YStack>
    </YStack>

    {ready ? <>
      <XStack bg="surface" borderColor="border-color" borderWidth={1} rounded={16}>
        {([['reviewed', ready.today, 'avgReviews', ready.dailyReviewed], ['learned', ready.newToday, 'avgNew', ready.dailyLearned]] as const)
          .map(([label, value, average, averageValue], index) => (
            <YStack key={label} flex={1} py={14} px={14} gap={4}
              borderLeftWidth={index > 0 ? 1 : 0} borderLeftColor="border-color">
              <Text color="color" fontSize={13} fontWeight="600">{copy(language, label)}</Text>
              <Text color="color" fontSize={32} fontWeight="700" fontVariant={['tabular-nums']} style={{ includeFontPadding: false }}>
                <CountUp value={value} delay={160 + 145 * index} celebration={celebration} />
              </Text>
              <Text color="muted" fontSize={12}>{averageValue} · {copy(language, average)}</Text>
            </YStack>
          ))}
      </XStack>
    </> : <Section title="AnkiDroid">
      <Text color="muted">{copy(language, activity && activity.kind !== 'ready' ? activity.kind : 'loading')}</Text>
      {activity?.kind === 'permission' && <Action primary disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('permission')}>{copy(language, 'connect')}</Action>}
    </Section>}

    <XStack gap={8} flexWrap="wrap">
      {activity?.kind !== 'missing' && <Action primary disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('open')}>{copy(language, 'openAnki')}</Action>}
      <Action disabled={dashboard.refreshing} onPress={() => void dashboard.refresh()}>
        {copy(language, dashboard.refreshing ? 'refreshing' : 'refresh')}
      </Action>
    </XStack>
    {ready && <ActivityHeatmap history={ready.history} palette={palette} language={language} />}
  </>;
}

function ActivityHeatmap({ history, palette, language }: {
  history: ReviewHistory;
  palette: Palette; language: Language;
}) {
  const todaySlot = (historyColumns - 1) * historyRows + history.todayRow;
  const counts = history.counts.slice(-(todaySlot + 1));
  const activeDays = counts.filter((count) => count > 0).sort((a, b) => a - b);
  const thresholds = [.45, .72, .90].map((rank) => activeDays[Math.floor((activeDays.length - 1) * rank)] ?? 0);
  const title = copy(language, 'activity');
  const period = copy(language, 'historyWeeks', { count: historyColumns });

  return <Section title={title}>
    <YStack accessible accessibilityLabel={`${title} · ${period}`} gap={3}>
      {Array.from({ length: historyRows }, (_, row) => (
        <XStack key={row} gap={3} items="center">
          <Text w={27} color="muted" fontSize={9} lineHeight="12px">{weekdays[language][row]}</Text>
          {Array.from({ length: historyColumns }, (_, column) => {
            const slot = column * historyRows + row;
            const count = counts[slot] ?? 0;
            const intensity = count > 0 ? 1 + thresholds.filter((threshold) => count > threshold).length : 0;
            return <View key={column} flex={1} aspectRatio={1.12} rounded={3}
              bg={slot > todaySlot ? 'transparent' : palette.heat[intensity]}
              borderColor="accent" borderWidth={slot === todaySlot ? 1.4 : 0} />;
          })}
        </XStack>
      ))}
    </YStack>
    <XStack justify="space-between" flexWrap="wrap" gap={6}>
      <Text color="muted" fontSize={12}>{period}</Text>
      <XStack items="center" gap={3}>
        <Text color="muted" fontSize={12}>{copy(language, 'less')}</Text>
        {palette.heat.map((color) => <View key={color} w={10} h={10} rounded={2} bg={color} />)}
        <Text color="muted" fontSize={12}>{copy(language, 'more')}</Text>
      </XStack>
    </XStack>
  </Section>;
}
