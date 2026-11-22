import { useLingui } from '@lingui/react';
import { ArrowUpRight } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { historyColumns, historyRows, type ReviewHistory } from './activity';
import type { Palette } from './appearance';
import { ReviewStamp } from './ReviewStamp';
import { messages, weekdays } from './messages';
import { cardContentInset } from './screenLayout';
import { CountUp, Portrait, Section } from './studyComponents';
import { themes } from './themes';
import type { useDashboard } from './dashboardMachine';
import { VictoryLaurels } from './VictoryLaurels';

export function TodayScreen({ dashboard, palette, celebration, stampInk }: {
  dashboard: ReturnType<typeof useDashboard>; palette: Palette; celebration: number; stampInk: string;
}) {
  const { _ } = useLingui();
  const { width } = useWindowDimensions();
  const { activity, themeId } = dashboard;
  const ready = activity?.kind === 'ready' ? activity : null;
  const canStart = Boolean(ready && ready.dueReviews > 0);
  const canConnect = activity?.kind === 'permission';
  const actionable = canStart || canConnect;
  const reviewLabel = ready
    ? canStart ? 'startReviews' : ready.today > 0 ? 'reviewsComplete' : 'noReviewsDue'
    : canConnect ? 'connect' : dashboard.initialCheckComplete ? 'reviewsUnavailable' : 'startReviews';
  const theme = themes[themeId];
  const mood = ready?.mood ?? 'waiting';
  return <>
    <YStack minH={208} rounded={22} bg="hero" overflow="hidden" justify="center">
      <Portrait drawable={theme[mood]} aspect={theme.portraitAspect[mood]} height={198} maxWidth={Math.min(width * .47, 240)} />
      <YStack w="53%" px={10} py={20} items="center">
        <YStack w="100%" maxW={192} items="center" justify="center" minH={112}>
          <VictoryLaurels color={palette.accent} />
          <Text color="color" fontFamily="display" fontWeight="700" fontSize={60} letterSpacing={-1}
            w="58%" text="center" fontVariant={['tabular-nums']} style={{ includeFontPadding: false }}
            adjustsFontSizeToFit numberOfLines={1}>
            <CountUp value={ready?.streak} delay={0} celebration={celebration} />
          </Text>
          <Text color="accent" fontWeight="700" fontSize={14} text="center" style={{ marginTop: -4 }}>{_(messages.streak)}</Text>
        </YStack>
      </YStack>
    </YStack>

    <XStack minH={60} rounded={14} bg={actionable ? 'accent' : 'subtle'} px={cardContentInset} py={6}
      gap={12} items="center" accessibilityRole="button"
      accessibilityState={{ disabled: !actionable || dashboard.requesting }}
      opacity={actionable && !dashboard.requesting ? 'press:0.80' : undefined}
      onPress={actionable && !dashboard.requesting ? () => dashboard.runAndroidRequest(canConnect ? 'permission' : 'open') : undefined}>
      <Text flex={1} fontSize={16} fontWeight="700" color={actionable ? 'on-accent' : 'color'}>
        {_(messages[reviewLabel])}
      </Text>
      {reviewLabel === 'reviewsComplete' && <ReviewStamp ink={stampInk} />}
      {actionable && <ArrowUpRight color={palette.onAccent} size={22} />}
    </XStack>

    <XStack bg="surface" borderColor="border-color" borderWidth={1} rounded={16}>
      {([['reviewed', ready?.today, 'avgReviews', ready?.dailyReviewed], ['learned', ready?.newToday, 'avgNew', ready?.dailyLearned]] as const)
        .map(([label, value, average, averageValue], index) => (
          <YStack key={label} flex={1} py={14} px={cardContentInset - 1} gap={4}
            borderLeftWidth={index > 0 ? 1 : 0} borderLeftColor="border-color">
            <Text color="color" fontSize={13} fontWeight="600">{_(messages[label])}</Text>
            <Text color="color" fontSize={32} fontWeight="700" fontVariant={['tabular-nums']}
              adjustsFontSizeToFit numberOfLines={1} style={{ includeFontPadding: false }}>
              <CountUp value={value} delay={160 + 145 * index} celebration={celebration} />
            </Text>
            <Text color="muted" fontSize={12}>{averageValue ?? '—'} · {_(messages[average])}</Text>
          </YStack>
        ))}
    </XStack>

    <ActivityHeatmap history={ready?.history} palette={palette} />
    {activity?.kind !== 'ready' && dashboard.initialCheckComplete && <Text color="muted">
      {_(messages[activity?.kind ?? 'unavailable'])}
    </Text>}
  </>;
}

function ActivityHeatmap({ history, palette }: {
  history: ReviewHistory | undefined;
  palette: Palette;
}) {
  const { _ } = useLingui();
  const todaySlot = (historyColumns - 1) * historyRows + (history?.todayRow ?? historyRows - 1);
  const counts = history?.counts.slice(-(todaySlot + 1)) ?? [];
  const activeDays = counts.filter((count) => count > 0).sort((a, b) => a - b);
  const thresholds = [.45, .72, .90].map((rank) => activeDays[Math.floor((activeDays.length - 1) * rank)] ?? 0);
  const title = _(messages.activity);
  const period = _(messages.historyWeeks.id, { count: historyColumns });

  return <Section title={title}>
    <YStack accessible accessibilityLabel={`${title} · ${period}`} gap={3}>
      {weekdays.map((weekday, row) => (
        <XStack key={weekday.id} gap={3} items="center">
          <Text w={27} color="muted" fontSize={9} lineHeight="12px">{_(weekday)}</Text>
          {Array.from({ length: historyColumns }, (_, column) => {
            const slot = column * historyRows + row;
            const count = counts[slot] ?? 0;
            const intensity = count > 0 ? 1 + thresholds.filter((threshold) => count > threshold).length : 0;
            return <View key={column} flex={1} aspectRatio={1.12} rounded={3}
              bg={slot > todaySlot ? 'transparent' : palette.heat[intensity]}
              borderColor="accent" borderWidth={history && slot === todaySlot ? 1.4 : 0} />;
          })}
        </XStack>
      ))}
    </YStack>
    <XStack justify="space-between" flexWrap="wrap" gap={6}>
      <Text color="muted" fontSize={12}>{period}</Text>
      <XStack items="center" gap={3}>
        <Text color="muted" fontSize={12}>{_(messages.less)}</Text>
        {palette.heat.map((color) => <View key={color} w={10} h={10} rounded={2} bg={color} />)}
        <Text color="muted" fontSize={12}>{_(messages.more)}</Text>
      </XStack>
    </XStack>
  </Section>;
}
