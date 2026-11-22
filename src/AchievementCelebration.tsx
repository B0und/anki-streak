import { useLingui } from '@lingui/react';
import { Canvas, Circle, Group, LinearGradient, Path, vec } from '@shopify/react-native-skia';
import { useActorRef } from '@xstate/react';
import { StatusBar } from 'expo-status-bar';
import { Modal, StyleSheet, useWindowDimensions } from 'react-native';
import {
  cancelAnimation, Easing, Extrapolation, interpolate, useDerivedValue, useReducedMotion, useSharedValue,
  withTiming, type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text, YStack } from 'tamagui';
import { createCallbackLogic } from 'xstate';

import { useAppAppearance } from './useAppAppearance';
import { messages } from './messages';
import { useProgress } from './progressContext';
import { achievements, type Achievement } from './studyProgress';
import { Action } from './studyComponents';

const gold = '#FFD98A';
const amber = '#C58442';
const darkGold = '#6F401A';
const paper = '#FFF3CE';
const sealColors = ['#FFD98A', '#FFF3D1', '#E9A361', '#FF917A'] as const;
const medalOutline = 'M0 -79L54 -60L77 -9L63 47L19 72L0 92L-19 72L-63 47L-77 -9L-54 -60Z';
const medalInset = 'M0 -62L43 -47L61 -7L49 35L14 55L0 69L-14 55L-49 35L-61 -7L-43 -47Z';
const medalMarks: Record<Achievement, string> = {
  firstReview: 'M0 -35Q5 -9 31 -4Q5 1 0 29Q-5 1 -31 -4Q-5 -9 0 -35Z M26 -33V-19M19 -26H33M-25 13V25M-31 19H-19',
  clearQueue: 'M-32 -4L-10 18L33 -25M-27 29H27',
  weekStreak: 'M0 -41Q25 -23 25 -2L34 -12Q43 24 13 33Q-9 41 -27 23Q-46 3 -23 -24Q-23 -12 -16 -9Q-16 -27 0 -41Z M2 33Q-17 26 -10 11Q-4 2 3 -5Q4 8 13 13Q18 27 2 33Z',
  monthStreak: 'M-34 -20L-20 -8L0 -32L20 -8L34 -20L26 19H-26Z M-25 28H25',
};

const particles = Array.from({ length: 40 }, (_, index) => ({
  index,
  angle: index * 2.39996,
  speed: 78 + (index * 61) % 156,
  size: 1.8 + (index * 13) % 5,
  color: sealColors[index % sealColors.length] ?? gold,
}));

function Spark({ time, particle }: { time: SharedValue<number>; particle: (typeof particles)[number] }) {
  const transform = useDerivedValue(() => {
    const elapsed = Math.max(0, time.value - .23);
    const travel = (1 - Math.exp(-4.5 * elapsed)) * particle.speed;
    return [
      { translateX: Math.cos(particle.angle) * travel },
      { translateY: Math.sin(particle.angle) * travel + elapsed * elapsed * 250 },
      { rotate: particle.angle + elapsed * 4 },
    ];
  });
  const { size } = particle;
  return <Group transform={transform}>
    <Path path={`M0 ${-size * 2.7}L${size} 0L0 ${size * 1.6}L${-size} 0Z`} color={particle.color} />
  </Group>;
}

const playMedal = createCallbackLogic({
  run: ({ input }: { input: { reduceMotion: boolean; time: SharedValue<number> } }) => {
    if (input.reduceMotion) return;
    input.time.value = withTiming(1, { duration: 2100, easing: Easing.linear });
    return () => cancelAnimation(input.time);
  },
});

function MedalBurst({ award, accent }: { award: Achievement; accent: string }) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const height = Math.min(width * .84, 354);
  const time = useSharedValue(reduceMotion ? 1 : 0);

  useActorRef(playMedal, { input: { reduceMotion, time } });

  const medalTransform = useDerivedValue(() => [
    { translateY: interpolate(time.value, [0, .11, .23, .30, .43, 1], [-92, -57, 9, -8, 0, 0], Extrapolation.CLAMP) },
    { rotate: interpolate(time.value, [0, .23, .29, .46], [-.35, .03, -.07, 0], Extrapolation.CLAMP) },
    { scale: interpolate(time.value, [0, .12, .23, .29, .39, .56], [.34, .58, 1.19, .92, 1.055, 1], Extrapolation.CLAMP) },
  ]);
  const medalOpacity = useDerivedValue(() => interpolate(time.value, [0, .06, .17], [.25, .7, 1], Extrapolation.CLAMP));
  const ringRadius = useDerivedValue(() => interpolate(time.value, [.22, .86], [50, 230], Extrapolation.CLAMP));
  const ringOpacity = useDerivedValue(() => interpolate(time.value, [.22, .26, .50, .80], [0, .9, .26, 0], Extrapolation.CLAMP));
  const echoRadius = useDerivedValue(() => interpolate(time.value, [.30, .92], [58, 200], Extrapolation.CLAMP));
  const echoOpacity = useDerivedValue(() => interpolate(time.value, [.28, .34, .52, .86], [0, .58, .26, 0], Extrapolation.CLAMP));
  const flareOpacity = useDerivedValue(() => interpolate(time.value, [.20, .24, .38], [0, .78, 0], Extrapolation.CLAMP));
  const sparksOpacity = useDerivedValue(() => interpolate(time.value, [.22, .31, .68, 1], [0, 1, .72, 0], Extrapolation.CLAMP));
  const sheen = useDerivedValue(() => [{ translateX: interpolate(time.value, [.34, .65], [-113, 114], Extrapolation.CLAMP) }]);

  return <Canvas style={{ width, height }} pointerEvents="none" accessible={false}>
    <Group transform={[{ translateX: width / 2 }, { translateY: height / 2 }, { scale: Math.min(width / 360, 1.15) }]}>
      <Path path="M0 -143L3 -100L100 -100L72 -72L145 0L76 2L98 96L62 63L0 144L-3 99L-99 98L-72 72L-145 0L-75 -2L-98 -98L-62 -63Z"
        color={gold} opacity={.11} style="stroke" strokeWidth={1} />
      <Circle cx={0} cy={0} r={111} style="stroke" strokeWidth={1} color={amber} opacity={.31} />
      <Circle cx={0} cy={0} r={123} style="stroke" strokeWidth={1} color={amber} opacity={.16} />
      {!reduceMotion && <>
        <Circle cx={0} cy={0} r={ringRadius} color={paper} style="stroke" strokeWidth={2} opacity={ringOpacity} />
        <Circle cx={0} cy={0} r={echoRadius} color={accent} style="stroke" strokeWidth={1} opacity={echoOpacity} />
        <Path path="M-200 0L-62 -4L0 -150L7 -9L200 0L60 6L0 154L-8 8Z" color={paper} opacity={flareOpacity} />
        <Group opacity={sparksOpacity}>
          {particles.map((particle) => <Spark key={particle.index} time={time} particle={particle} />)}
        </Group>
      </>}
      <Group transform={medalTransform} opacity={medalOpacity}>
        <Path path="M-61 28L-74 91L-40 75L-27 108L-8 61M61 28L74 91L40 75L27 108L8 61" color="#A73E3B" />
        <Path path="M-56 40L-64 78L-41 67M56 40L64 78L41 67" color="#F88B74" style="stroke" strokeWidth={2} />
        <Path path={medalOutline}>
          <LinearGradient start={vec(-65, -78)} end={vec(68, 82)} colors={[paper, gold, darkGold, gold, amber]} />
        </Path>
        <Path path={medalInset}>
          <LinearGradient start={vec(0, -65)} end={vec(0, 68)} colors={['#52371F', '#231A17', '#4C3021']} />
        </Path>
        <Path path={medalInset} style="stroke" strokeWidth={1.4} color={gold} opacity={.75} />
        <Path path={medalMarks[award]} color={paper} style="stroke" strokeWidth={4.2}
          strokeJoin="round" strokeCap="round" />
        {!reduceMotion && <Group clip={medalOutline}>
          <Path path="M-39 102L-7 102L53 -91L20 -91Z" color={paper} transform={sheen} opacity={.23} />
        </Group>}
        <Path path="M-27 -52L0 -62L14 -56M46 41L14 57L0 71L-14 57M-72 -9L-52 -56"
          color={paper} style="stroke" strokeWidth={1.6} strokeCap="round" opacity={.74} />
      </Group>
    </Group>
  </Canvas>;
}

export function AchievementCelebration() {
  const { _ } = useLingui();
  const { palette } = useAppAppearance();
  const { unveiling, dismiss } = useProgress();
  if (!unveiling) return null;
  const award = unveiling.kind === 'replay' ? unveiling.award : unveiling.awards.at(-1);
  const entry = achievements.find(({ id }) => id === award);
  if (!entry) return null;
  const additional = unveiling.kind === 'new' ? unveiling.awards.length - 1 : 0;

  return <Modal visible transparent={false} animationType="none" onRequestClose={dismiss}
    statusBarTranslucent navigationBarTranslucent>
    <StatusBar style="light" />
    <SafeAreaView style={styles.surface} accessibilityViewIsModal>
      <ScrollView contentContainerStyle={styles.centered} alwaysBounceVertical={false}>
        <MedalBurst key={entry.id} award={entry.id} accent={palette.accent} />
        <YStack w="100%" maxW={440} px={26} mt={-7} pb={20} gap={10} items="center">
          <Text accessibilityRole="header" text="center" color="#FFF3CE" fontFamily="display"
            fontSize={37} fontWeight="700" style={{ includeFontPadding: false }}>{_(messages[entry.title])}</Text>
          <Text accessibilityLiveRegion="polite" text="center" color="#E4B777" fontWeight="700" fontSize={14}>
            {_(messages[unveiling.kind === 'new' ? 'awardUnlocked' : 'achievement'])}
          </Text>
          <Text text="center" color="#E0C9B4" fontSize={16}>{_(messages[entry.detail])}</Text>
          {additional > 0 && <Text text="center" color="#E4B777" fontSize={14}>
            {_(messages.additionalAwards.id, { count: additional })}
          </Text>}
          <YStack mt={13} w="100%">
            <Action primary onPress={dismiss}>{_(messages.awardContinue)}</Action>
          </YStack>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  surface: { flex: 1, backgroundColor: '#231713' },
  centered: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
});
