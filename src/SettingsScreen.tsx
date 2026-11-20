import { Bell, CheckCircle2, Circle, Globe2, Medal, Palette as PaletteIcon, RefreshCcw, Sparkles } from 'lucide-react-native';
import { Input, Switch, Text, XStack, YStack } from 'tamagui';

import type { Palette } from './appearance';
import { DueReviewDecks } from './DueReviewDecks';
import { copy, type Language } from './messages';
import {
  appearanceOptions, hasTarget, languageOptions, milestones,
  type Appearance, type LanguagePreference,
} from './preferences';
import { useRewardSettings } from './rewardSettingsMachine';
import { Action, Choices } from './studyComponents';
import type { useDashboard } from './useDashboard';

export function SettingsScreen({ palette, language, appearance, setAppearance, languagePreference, setLanguage, dashboard }: {
  palette: Palette; language: Language; appearance: Appearance; setAppearance(value: Appearance): void;
  languagePreference: LanguagePreference; setLanguage(value: LanguagePreference): void;
  dashboard: ReturnType<typeof useDashboard>;
}) {
  const { milestone, draft, notifications, animate, blocked, send } = useRewardSettings();

  return <>
    <SettingsGroup title={copy(language, 'appearance')} icon={PaletteIcon} color={palette.accent}>
      <Choices<Appearance> choices={appearanceOptions} value={appearance} onChange={setAppearance}
        label={(key) => copy(language, key)} />
    </SettingsGroup>
    <SettingsGroup title={copy(language, 'language')} icon={Globe2} color={palette.accent}>
      <Choices<LanguagePreference> choices={languageOptions} value={languagePreference} onChange={setLanguage}
        label={(key) => key === 'system' ? copy(language, key) : key === 'en' ? 'English' : 'Русский'} />
    </SettingsGroup>
    <SettingsGroup title={copy(language, 'rewards')} icon={Medal} color={palette.accent}>
      <Text color="muted" fontWeight="600">{copy(language, 'milestone')}</Text>
      {milestones.map((key) => (
        <XStack accessibilityRole="radio" accessibilityState={{ checked: milestone === key }} key={key}
          onPress={() => send({ type: 'milestone', value: key })} minH={48} px={10} py={8} gap={10} items="center"
          rounded={8} bg={milestone === key ? 'subtle' : 'transparent'} opacity="press:0.75">
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
        <XStack key={key} gap={10} minH={48} items="center" justify="space-between">
          <Text color="color" flex={1}>{copy(language, key)}</Text>
          {key === 'notifications' ? <Bell size={18} color={palette.muted} /> : <Sparkles size={18} color={palette.muted} />}
          <Switch accessibilityLabel={copy(language, key)} hitSlop={8} checked={value} onCheckedChange={action}
            bg={value ? 'accent' : 'border-color'} borderColor="transparent">
            <Switch.Thumb bg={value ? 'on-accent' : 'surface'} />
          </Switch>
        </XStack>
      ))}
      {blocked && <Action disabled={dashboard.requesting} onPress={() => dashboard.runAndroidRequest('notifications')}>{copy(language, 'notificationsBlocked')}</Action>}
      <Text color="muted" lineHeight="19px">{copy(language, 'rewardTiming')}</Text>
    </SettingsGroup>
    <SettingsGroup title={copy(language, 'sync')} icon={RefreshCcw} color={palette.accent}>
      <Text color="muted" lineHeight="20px">{copy(language, 'syncDetail')}</Text>
      <Text color="color">
        {copy(language, 'lastCheck', {
          time: dashboard.lastCheckedAt === undefined ? '—'
            : new Date(dashboard.lastCheckedAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }),
        })}
      </Text>
      {dashboard.activity?.kind === 'permission' && <Action primary disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('permission')}>{copy(language, 'connect')}</Action>}
      <Action disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('settings')}>{copy(language, 'permissions')}</Action>
    </SettingsGroup>
  </>;
}


export function SettingsGroup({ title, icon: Icon, color, children }: {
  title: string;
  icon: typeof Medal;
  color: string;
  children: React.ReactNode;
}) {
  return <YStack gap={10} pt={14} pb={10} borderTopWidth={1} borderTopColor="border-color">
    <XStack gap={10} items="center">
      <Icon size={20} color={color} />
      <Text accessibilityRole="header" color="color" fontSize={17} fontWeight="700">{title}</Text>
    </XStack>
    {children}
  </YStack>;
}
