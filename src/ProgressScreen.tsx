import { BookOpen, Check, Flame, Layers, ListChecks, Lock, Play, Sparkles, Trophy } from 'lucide-react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { useDashboardContext } from './dashboardContext';
import { copy } from './messages';
import { questTargets, useProgress } from './progressContext';
import { Screen } from './Screen';
import { achievements, dailyQuests } from './studyProgress';

const questIcons = { firstReview: BookOpen, reviewTarget: ListChecks, newTarget: Layers, finishDue: Check };
const awardIcons = { firstReview: Sparkles, clearQueue: Check, weekStreak: Flame, monthStreak: Trophy };

export function ProgressScreen() {
  const { dashboard, language, palette } = useDashboardContext();
  const { earned, replay } = useProgress();
  const activity = dashboard.activity?.kind === 'ready' ? dashboard.activity : null;
  const quests = dailyQuests(activity, questTargets());
  const completed = quests.filter((quest) => quest.value >= quest.target).length;

  return <Screen title={copy(language, 'progress')}>
    <YStack gap={8}>
      <XStack items="center" gap={10} flexWrap="wrap" justify="space-between">
        <Text accessibilityRole="header" color="color" fontFamily="display" fontSize={23} fontWeight="700">
          {copy(language, 'dailyQuests')}
        </Text>
        <Text color="accent" fontSize={13} fontWeight="700">
          {activity ? copy(language, 'questsComplete', { count: completed, total: quests.length }) : '—'}
        </Text>
      </XStack>
      <YStack bg="surface" rounded={16} borderWidth={1} borderColor="border-color" overflow="hidden">
        {quests.map(({ id, title, value, target }, index) => {
          const done = value >= target;
          const progress = Math.min(value, target);
          const label = copy(language, title);
          const status = !activity ? '—' : done ? copy(language, 'questDone') : `${progress} / ${target}`;
          const Icon = questIcons[id];
          return <XStack key={id} accessible accessibilityLabel={`${label}. ${status}`} minH={64} px={14} py={9} gap={12}
            borderTopWidth={index ? 1 : 0} borderTopColor="border-color" items="center">
            <View w={34} h={34} rounded={10} bg="subtle" items="center" justify="center">
              <Icon color={done ? palette.accent : palette.muted} size={19} strokeWidth={2} />
            </View>
            <YStack flex={1} gap={6}>
              <Text color="color" fontSize={15} fontWeight="600">{label}</Text>
              {target > 1 && <View h={4} rounded={2} overflow="hidden" bg="subtle">
                <View h="100%" w={`${(progress / target) * 100}%`} rounded={2} bg="accent" />
              </View>}
            </YStack>
            <Text color={done ? 'accent' : 'muted'} fontSize={13} fontWeight="600" fontVariant={['tabular-nums']}>{status}</Text>
          </XStack>;
        })}
      </YStack>
    </YStack>

    <YStack gap={3} mt={6}>
      <XStack items="center" gap={10} flexWrap="wrap" justify="space-between">
        <Text accessibilityRole="header" color="color" fontFamily="display" fontSize={23} fontWeight="700">
          {copy(language, 'achievements')}
        </Text>
        <Text color="muted" fontSize={13} fontWeight="600">
          {copy(language, 'achievementsEarned', { count: earned.length, total: achievements.length })}
        </Text>
      </XStack>

      {achievements.map(({ id, title, detail }, index) => {
        const unlocked = earned.includes(id);
        const Icon = awardIcons[id];
        return <XStack key={id} accessible accessibilityRole={unlocked ? 'button' : undefined}
          accessibilityLabel={`${copy(language, title)}. ${copy(language, detail)}. ${copy(language, unlocked ? 'replayAward' : 'awardLocked')}`}
          onPress={unlocked ? () => replay(id) : undefined} opacity={unlocked ? 'press:0.75' : undefined}
          borderTopWidth={index ? 1 : 0} borderTopColor="border-color" minH={62} py={9} gap={12} items="center">
          <View w={40} h={40} rounded={20} bg={unlocked ? 'hero' : 'subtle'} items="center" justify="center">
            <Icon size={21} color={unlocked ? palette.accent : palette.muted} />
          </View>
          <YStack flex={1} gap={2}>
            <Text color="color" fontSize={15} fontWeight="700">{copy(language, title)}</Text>
            <Text color="muted" fontSize={13}>{copy(language, detail)}</Text>
          </YStack>
          {unlocked ? <Play size={16} color={palette.accent} /> : <Lock size={16} color={palette.muted} />}
        </XStack>;
      })}
    </YStack>
    {!activity && dashboard.initialCheckComplete && <Text color="muted">{copy(language, 'questsUnavailable')}</Text>}
  </Screen>;
}
