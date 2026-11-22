import { useLingui } from '@lingui/react';
import { Bell, CheckCircle2, Circle, Globe2, Medal, Palette as PaletteIcon, RefreshCcw, Sparkles } from 'lucide-react-native';
import { Input, Switch, Text, XStack, YStack } from 'tamagui';

import { useDashboard } from './dashboardMachine';
import { DueReviewDecks } from './DueReviewDecks';
import { messages } from './messages';
import {
  appearanceOptions, hasTarget, languageOptions, milestones,
  type Appearance, type LanguagePreference,
} from './preferences';
import { useRewardSettings } from './rewardSettingsMachine';
import { settingsIconGap, settingsRowPadding } from './screenLayout';
import { Action, Choices, SettingsIconSlot } from './studyComponents';
import { useAppAppearance } from './useAppAppearance';

export function SettingsScreen() {
  const { _, i18n } = useLingui();
  const dashboard = useDashboard();
  const { appearance, setAppearance, languagePreference, setLanguage } = dashboard;
  const { palette } = useAppAppearance();
  const { milestone, draft, notifications, animate, blocked, send } = useRewardSettings();

  return <>
    <SettingsGroup title={_(messages.appearance)} icon={PaletteIcon} color={palette.accent}>
      <Choices<Appearance> choices={appearanceOptions} value={appearance} onChange={setAppearance}
        label={(key) => _(messages[key])} />
    </SettingsGroup>
    <SettingsGroup title={_(messages.language)} icon={Globe2} color={palette.accent}>
      <Choices<LanguagePreference> choices={languageOptions} value={languagePreference} onChange={setLanguage}
        label={(key) => key === 'system' ? _(messages[key]) : key === 'en' ? 'English' : 'Русский'} />
    </SettingsGroup>
    <SettingsGroup title={_(messages.rewards)} icon={Medal} color={palette.accent}>
      <Text color="muted" fontWeight="600">{_(messages.milestone)}</Text>
      {milestones.map((key) => (
        <XStack accessibilityRole="radio" accessibilityState={{ checked: milestone === key }} key={key}
          onPress={() => send({ type: 'milestone', value: key })} minH={48} mx={-settingsRowPadding}
          px={settingsRowPadding} py={8} gap={settingsIconGap} items="center"
          rounded={8} bg={milestone === key ? 'subtle' : 'transparent'} opacity="press:0.75">
          <SettingsIconSlot>
            {milestone === key ? <CheckCircle2 size={18} color={palette.accent} /> : <Circle size={18} color={palette.muted} />}
          </SettingsIconSlot>
          <Text color="color" flex={1}>{_(messages[key])}</Text>
        </XStack>
      ))}
      {milestone === 'finishDue' && <DueReviewDecks palette={palette} />}
      {hasTarget(milestone) && <XStack items="center" gap={12}>
        <Text color="color" flex={1}>{_(messages.targetInput)}</Text>
        <Input accessibilityLabel={_(messages.targetInput)} value={draft} maxLength={4}
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
        <XStack key={key} gap={settingsIconGap} minH={48} items="center">
          <SettingsIconSlot>
            {key === 'notifications' ? <Bell size={18} color={palette.muted} /> : <Sparkles size={18} color={palette.muted} />}
          </SettingsIconSlot>
          <Text color="color" flex={1}>{_(messages[key])}</Text>
          <Switch accessibilityLabel={_(messages[key])} hitSlop={8} checked={value} onCheckedChange={action}
            bg={value ? 'accent' : 'border-color'} borderColor="transparent">
            <Switch.Thumb bg={value ? 'on-accent' : 'surface'} />
          </Switch>
        </XStack>
      ))}
      {blocked && <Action disabled={dashboard.requesting} onPress={() => dashboard.runAndroidRequest('notifications')}>{_(messages.notificationsBlocked)}</Action>}
      <Text color="muted" lineHeight="19px">{_(messages.rewardTiming)}</Text>
    </SettingsGroup>
    <SettingsGroup title={_(messages.sync)} icon={RefreshCcw} color={palette.accent}>
      <Text color="muted" lineHeight="20px">{_(messages.syncDetail)}</Text>
      <Text color="color">
        {_(messages.lastCheck.id, {
          time: dashboard.lastCheckedAt === undefined ? '—'
            : new Date(dashboard.lastCheckedAt).toLocaleTimeString(i18n.locale, { hour: '2-digit', minute: '2-digit' }),
        })}
      </Text>
      {dashboard.activity?.kind === 'permission' && <Action primary disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('permission')}>{_(messages.connect)}</Action>}
      <Action disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('settings')}>{_(messages.permissions)}</Action>
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
    <XStack gap={settingsIconGap} items="center">
      <SettingsIconSlot><Icon size={20} color={color} /></SettingsIconSlot>
      <Text accessibilityRole="header" color="color" fontSize={17} fontWeight="700">{title}</Text>
    </XStack>
    {children}
  </YStack>;
}
