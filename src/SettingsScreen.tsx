import { CheckCircle2, Circle } from 'lucide-react-native';
import { Input, Switch, Text, XStack } from 'tamagui';

import type { Palette } from './appearance';
import { DueReviewDecks } from './DueReviewDecks';
import { copy, type Language } from './messages';
import {
  appearanceOptions, hasTarget, languageOptions, milestones,
  type Appearance, type LanguagePreference,
} from './preferences';
import { useRewardSettings } from './rewardSettingsMachine';
import { Action, Choices, Section } from './studyComponents';
import type { useDashboard } from './useDashboard';

export function SettingsScreen({ palette, language, appearance, setAppearance, languagePreference, setLanguage, dashboard }: {
  palette: Palette; language: Language; appearance: Appearance; setAppearance(value: Appearance): void;
  languagePreference: LanguagePreference; setLanguage(value: LanguagePreference): void;
  dashboard: ReturnType<typeof useDashboard>;
}) {
  const { milestone, draft, notifications, animate, blocked, send } = useRewardSettings();

  return <>
    <Section title={copy(language, 'appearance')}>
      <Choices<Appearance> choices={appearanceOptions} value={appearance} onChange={setAppearance}
        label={(key) => copy(language, key)} />
    </Section>
    <Section title={copy(language, 'language')}>
      <Choices<LanguagePreference> choices={languageOptions} value={languagePreference} onChange={setLanguage}
        label={(key) => key === 'system' ? copy(language, key) : key === 'en' ? 'English' : 'Русский'} />
    </Section>
    <Section title={copy(language, 'rewards')}>
      <Text color="muted">{copy(language, 'milestone')}</Text>
      {milestones.map((key) => (
        <XStack accessibilityRole="radio" accessibilityState={{ checked: milestone === key }} key={key}
          onPress={() => send({ type: 'milestone', value: key })} minH={44} p={8} gap={9} items="center"
          rounded={9} bg={milestone === key ? 'subtle' : 'surface'} opacity="press:0.75">
          {milestone === key ? <CheckCircle2 size={18} color={palette.accent} /> : <Circle size={18} color={palette.muted} />}
          <Text color="color" flex={1}>{copy(language, key)}</Text>
        </XStack>
      ))}
      {milestone === 'finishDue' && <DueReviewDecks language={language} palette={palette} />}
      {hasTarget(milestone) && <XStack items="center" gap={12}>
        <Text color="color" flex={1}>{copy(language, 'targetInput')}</Text>
        <Input accessibilityLabel={copy(language, 'targetInput')} value={draft} maxLength={4}
          keyboardType="number-pad" selectTextOnFocus
          minH={44} minW={66} px={9} text="center" bg="surface" color="color"
          borderColor="border-color focus:accent" borderWidth={1} rounded={9}
          onChangeText={(value) => send({ type: 'draft', value })}
          onBlur={() => send({ type: 'finishEditing' })} />
    </XStack>}
      {([
        ['notifications', notifications, (enabled: boolean) => send({ type: 'notifications', enabled })],
        ['animate', animate, (enabled: boolean) => send({ type: 'animate', enabled })],
      ] as const).map(([key, value, action]) => (
        <XStack key={key} gap={8} items="center" justify="space-between">
          <Text color="color" flex={1}>{copy(language, key)}</Text>
          <Switch accessibilityLabel={copy(language, key)} checked={value} onCheckedChange={action}
            bg={value ? 'accent' : 'border-color'} borderColor="transparent">
            <Switch.Thumb bg={value ? 'on-accent' : 'surface'} />
          </Switch>
        </XStack>
      ))}
      {blocked && <Action disabled={dashboard.requesting} onPress={() => dashboard.runAndroidRequest('notifications')}>{copy(language, 'notificationsBlocked')}</Action>}
      <Text color="muted" lineHeight="19px">{copy(language, 'rewardTiming')}</Text>
    </Section>
    <Section title={copy(language, 'sync')}>
      <Text color="muted" lineHeight="20px">{copy(language, 'syncDetail')}</Text>
      {dashboard.lastCheckedAt !== undefined && <Text color="color">
        {copy(language, 'lastCheck', {
          time: new Date(dashboard.lastCheckedAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }),
        })}
      </Text>}
      <Action disabled={dashboard.refreshing} onPress={() => void dashboard.refresh()}>
        {copy(language, dashboard.refreshing ? 'refreshing' : 'refresh')}
      </Action>
      {dashboard.activity?.kind === 'permission' && <Action primary disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('permission')}>{copy(language, 'connect')}</Action>}
      <Action disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('settings')}>{copy(language, 'permissions')}</Action>
    </Section>
  </>;
}
