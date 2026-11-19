import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { Palette } from './appearance';
import { copy, type Language } from './messages';
import { Action, CountUp, Portrait, Section } from './studyComponents';
import { themes } from './themes';
import type { useDashboard } from './useDashboard';
import { VictoryLaurels } from './VictoryLaurels';

export function TodayScreen({ dashboard, palette, language, celebration }: {
  dashboard: ReturnType<typeof useDashboard>; palette: Palette; language: Language; celebration: number;
}) {
  const { width } = useWindowDimensions();
  const { activity, themeId } = dashboard;
  const ready = activity?.kind === 'ready' ? activity : null;
  const portrait = themes[themeId][ready?.mood ?? 'waiting'];
  const history = ready?.history;
  const thresholds = history?.filter((count) => count > 0).sort((a, b) => a - b) ?? [];
  const colorFor = (count: number) => palette.heat[count <= 0 ? 0 :
    1 + [.45, .72, .90].filter((rank) => count > (thresholds[Math.floor((thresholds.length - 1) * rank)] ?? 0)).length];
  return <>
    <View style={[styles.hero, { borderColor: palette.line, backgroundColor: palette.hero }]}>
      <Portrait source={portrait} height={192} maxWidth={Math.min(width * .51, 228)} />
      <View style={styles.medal}>
        <VictoryLaurels color={palette.accent} />
        <Text style={[styles.streak, { color: palette.text }]} adjustsFontSizeToFit numberOfLines={1}>
          <CountUp value={ready?.streak} delay={0} celebration={celebration} />
        </Text>
        <Text style={{ color: palette.accent, fontWeight: '700', fontSize: 14, textAlign: 'center' }}>{copy(language, 'streak')}</Text>
      </View>
    </View>

    {ready ? <>
      <View style={[styles.stats, { backgroundColor: palette.surface, borderColor: palette.line }]}>
        {([['reviewed', ready.today, 'avgReviews', ready.dailyReviewed], ['learned', ready.newToday, 'avgNew', ready.dailyLearned]] as const)
          .map(([label, value, average, averageValue], index) => (
            <View key={label} style={[styles.stat, index > 0 && { borderLeftWidth: 1, borderLeftColor: palette.line }]}>
              <Text style={[styles.primaryNumber, { color: palette.text }]}>
                <CountUp value={value} delay={160 + 145 * index} celebration={celebration} />
              </Text>
              <Text style={[styles.statLabel, { color: palette.text }]}>{copy(language, label)}</Text>
              <Text style={[styles.average, { color: palette.muted }]}>{averageValue} · {copy(language, average)}</Text>
            </View>
          ))}
      </View>
      <Section palette={palette} title={copy(language, 'activity')}>
        <View accessible accessibilityLabel={`${copy(language, 'activity')} · ${copy(language, 'days102')}`} style={styles.heatmap}>
          {Array.from({ length: 6 }, (_, row) => (
            <View key={row} style={styles.heatRow}>
              {ready.history.slice(row * 17, (row + 1) * 17).map((count, index) => (
                <View key={index} style={[styles.cell, {
                  backgroundColor: colorFor(count), borderColor: palette.accent,
                  borderWidth: row === 5 && index === 16 ? 1.4 : 0,
                }]} />
              ))}
            </View>
          ))}
        </View>
        <View style={styles.legend}>
          <Text style={{ color: palette.muted, fontSize: 12 }}>{copy(language, 'days102')}</Text>
          <View style={styles.legendScale}>
            <Text style={{ color: palette.muted, fontSize: 12 }}>{copy(language, 'less')}</Text>
            {palette.heat.map((color) => <View key={color} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />)}
            <Text style={{ color: palette.muted, fontSize: 12 }}>{copy(language, 'more')}</Text>
          </View>
        </View>
      </Section>
      <View style={[styles.encouragement, { backgroundColor: palette.subtle, borderColor: palette.line }]}>
        <Image source={portrait} style={{ width: 45, height: 45, borderRadius: 22 }} />
        <Text style={{ flex: 1, color: palette.text, fontWeight: '700' }}>
          {celebration ? copy(language, 'rewardToast') + ' ' : ''}{copy(language, ready.today ? 'cheers' : 'waiting')}
        </Text>
      </View>
    </> : <Section title="AnkiDroid" palette={palette}>
      <Text style={{ color: palette.muted }}>{copy(language, activity && activity.kind !== 'ready' ? activity.kind : 'loading')}</Text>
      {activity?.kind === 'permission' && <Action palette={palette} primary disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('permission')}>{copy(language, 'connect')}</Action>}
    </Section>}

    <View style={{ gap: 8, flexDirection: 'row' }}>
      {activity?.kind !== 'missing' && <Action palette={palette} disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('open')}>{copy(language, 'openAnki')}</Action>}
      <Action palette={palette} disabled={dashboard.refreshing} onPress={() => void dashboard.refresh()}>
        {copy(language, dashboard.refreshing ? 'refreshing' : 'refresh')}
      </Action>
    </View>
  </>;
}

const styles = StyleSheet.create({
  hero: { height: 208, borderRadius: 23, borderWidth: 1, overflow: 'hidden', justifyContent: 'center' },
  medal: { width: '49%', alignItems: 'center', paddingHorizontal: 10 },
  streak: { fontFamily: 'serif', fontWeight: 'bold', fontSize: 73, lineHeight: 82, includeFontPadding: false, maxWidth: '64%' },
  stats: { flexDirection: 'row', borderRadius: 18, borderWidth: 1 },
  stat: { flex: 1, paddingVertical: 13, paddingHorizontal: 12, alignItems: 'center', gap: 2 },
  primaryNumber: { fontSize: 34, fontFamily: 'serif', fontWeight: 'bold', includeFontPadding: false },
  statLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  average: { marginTop: 6, fontSize: 11, textAlign: 'center' },
  heatmap: { gap: 3 },
  heatRow: { flexDirection: 'row', gap: 3 },
  cell: { flex: 1, aspectRatio: 1.12, borderRadius: 3 },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendScale: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  encouragement: { borderWidth: 1, borderRadius: 16, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
