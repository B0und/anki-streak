import { useActor } from '@xstate/react';
import { BookOpen, Check, LayoutPanelTop, Trophy } from 'lucide-react-native';
import { BackHandler, Image, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text, View, XStack, YStack } from 'tamagui';
import { createCallbackLogic, createMachine } from 'xstate';

import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import { settings } from './preferences';
import { Action } from './studyComponents';
import { themes } from './themes';

const handleAndroidBack = createCallbackLogic({
  run: ({ sendBack }) => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      sendBack({ type: 'back' });
      return true;
    });
    return () => listener.remove();
  },
});

const onboarding = createMachine({
  id: 'onboarding',
  initial: 'check',
  states: {
    check: {
      always: () => settings.shouldOnboard() ? { target: 'welcome' } : { target: 'done' },
    },
    welcome: {
      entry: (_, enq) => enq(settings.setPreference, 'onboarding', 'started'),
      on: { next: { target: 'connect' } },
    },
    connect: { invoke: { src: handleAndroidBack }, on: { next: { target: 'routine' }, back: { target: 'welcome' } } },
    routine: { invoke: { src: handleAndroidBack }, on: { next: { target: 'done' }, back: { target: 'connect' } } },
    done: { type: 'final' },
  },
  on: {
    skip: { target: '.done' },
  },
});

export function useOnboarding() {
  const [snapshot, send] = useActor(onboarding);
  const step = snapshot.matches('welcome') ? 'welcome' : snapshot.matches('connect') ? 'connect' : 'routine';
  return {
    step,
    done: snapshot.matches('done'),
    next() {
      if (step === 'routine') settings.setPreference('onboarding', 'complete');
      send({ type: 'next' });
    },
    back() { send({ type: 'back' }); },
    skip() {
      settings.setPreference('onboarding', 'complete');
      send({ type: 'skip' });
    },
  };
}

export function Onboarding({ flow }: { flow: ReturnType<typeof useOnboarding> }) {
  const { dashboard, palette, language } = useDashboardContext();
  const { height } = useWindowDimensions();
  const welcome = flow.step === 'welcome';
  const connect = flow.step === 'connect';
  const activity = dashboard.activity;
  const ready = activity?.kind === 'ready';
  const canConnect = activity?.kind === 'permission';
  const portrait = themes[dashboard.themeId].happy;
  const title = welcome ? 'onboardingWelcome' : connect ? 'onboardingConnect' : 'onboardingRoutine';
  const description = welcome ? 'onboardingWelcomeDetail' : connect ? 'onboardingConnectDetail' : 'onboardingRoutineDetail';

  return <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <YStack self="center" w="100%" maxW={500} px={24} py={12} gap={22}>
        <XStack justify="space-between" items="center" minH={48}>
          <XStack accessibilityLabel={copy(language, 'onboardingStep', { step: welcome ? 1 : connect ? 2 : 3 })}
            accessible items="center" gap={5}>
            {(['welcome', 'connect', 'routine'] as const).map((step) =>
              <View key={step} w={step === flow.step ? 24 : 8} h={5} rounded={3}
                bg={step === flow.step ? 'accent' : 'border-color'} />)}
          </XStack>
          <View accessibilityRole="button" minW={48} minH={48} justify="center" onPress={flow.skip}>
            <Text color="muted" text="right" fontWeight="600">{copy(language, 'onboardingSkip')}</Text>
          </View>
        </XStack>

        <YStack gap={14}>
          <YStack h={Math.min(height * .30, 238)} rounded={18} bg="hero" overflow="hidden" items="center" justify="center">
            {welcome
              ? <Image source={{ uri: portrait }} resizeMode="contain" accessibilityIgnoresInvertColors
                style={{ width: '100%', height: '100%' }} />
              : <View w={104} h={104} rounded={52} borderWidth={1} borderColor="border-color" bg="surface" items="center" justify="center">
                {connect ? <BookOpen color={palette.accent} size={46} strokeWidth={1.55} />
                  : <Trophy color={palette.accent} size={46} strokeWidth={1.55} />}
              </View>}
          </YStack>
          <Text accessibilityRole="header" color="color" fontFamily="display" fontSize={36} fontWeight="700"
            style={{ includeFontPadding: false }}>{copy(language, title)}</Text>
          <Text color="muted" fontSize={16} lineHeight="23px">{copy(language, description)}</Text>
        </YStack>

        {connect && <YStack minH={48} justify="center">
          {ready ? <XStack gap={8} items="center">
            <Check color={palette.accent} size={20} />
            <Text color="accent" fontWeight="700">{copy(language, 'onboardingConnected')}</Text>
          </XStack> : activity && !canConnect &&
            <Text color="muted" accessibilityLiveRegion="polite">{copy(language, activity.kind)}</Text>}
        </YStack>}
        {!welcome && !connect && <XStack items="center" gap={10}>
          <LayoutPanelTop color={palette.accent} size={22} />
          <Text flex={1} color="muted">{copy(language, 'onboardingWidget')}</Text>
        </XStack>}

        <YStack gap={6}>
          {connect && canConnect
            ? <>
              <Action primary disabled={dashboard.requesting} onPress={() => dashboard.runAndroidRequest('permission')}>
                {copy(language, 'connect')}
              </Action>
              <Action onPress={flow.next}>{copy(language, 'onboardingLater')}</Action>
            </>
            : <Action primary onPress={flow.next}>{copy(language, connect || welcome ? 'onboardingContinue' : 'onboardingFinish')}</Action>}
          {!welcome && <View minH={48} items="center" justify="center" accessibilityRole="button" onPress={flow.back}>
            <Text color="muted" fontWeight="600">{copy(language, 'back')}</Text>
          </View>}
        </YStack>
      </YStack>
    </ScrollView>
  </SafeAreaView>;
}
