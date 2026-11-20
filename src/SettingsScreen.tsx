import { CheckCircle2, Circle } from 'lucide-react-native';
import { Linking, Pressable, Switch, Text, TextInput, View } from 'react-native';

import type { Palette } from './appearance';
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
    <Section palette={palette} title={copy(language, 'appearance')}>
      <Choices<Appearance> palette={palette} choices={appearanceOptions} value={appearance} onChange={setAppearance}
        label={(key) => copy(language, key)} />
    </Section>
    <Section palette={palette} title={copy(language, 'language')}>
      <Choices<LanguagePreference> palette={palette} choices={languageOptions} value={languagePreference} onChange={setLanguage}
        label={(key) => key === 'system' ? copy(language, key) : key === 'en' ? 'English' : 'Русский'} />
    </Section>
    <Section palette={palette} title={copy(language, 'rewards')}>
      <Text style={{ color: palette.muted }}>{copy(language, 'milestone')}</Text>
      {milestones.map((key) => (
        <Pressable accessibilityRole="radio" accessibilityState={{ checked: milestone === key }} key={key}
          onPress={() => send({ type: 'milestone', value: key })} style={{
            minHeight: 44, padding: 8, gap: 9, flexDirection: 'row', alignItems: 'center',
            borderRadius: 9, backgroundColor: milestone === key ? palette.subtle : palette.surface,
          }}>
          {milestone === key ? <CheckCircle2 size={18} color={palette.accent} /> : <Circle size={18} color={palette.muted} />}
          <Text style={{ color: palette.text, flex: 1 }}>{copy(language, key)}</Text>
        </Pressable>
      ))}
      {hasTarget(milestone) && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ color: palette.text, flex: 1 }}>{copy(language, 'targetInput')}</Text>
        <TextInput accessibilityLabel={copy(language, 'targetInput')} value={draft} maxLength={4}
          keyboardType="number-pad" selectTextOnFocus
          style={{ minHeight: 44, minWidth: 66, paddingHorizontal: 9, textAlign: 'center',
            borderColor: palette.line, borderWidth: 1, borderRadius: 9, color: palette.text }}
          onChangeText={(value) => send({ type: 'draft', value })}
          onBlur={() => send({ type: 'finishEditing' })} />
    </View>}
      {([
        ['notifications', notifications, (enabled: boolean) => send({ type: 'notifications', enabled })],
        ['animate', animate, (enabled: boolean) => send({ type: 'animate', enabled })],
      ] as const).map(([key, value, action]) => (
        <View key={key} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: palette.text, flex: 1 }}>{copy(language, key)}</Text>
          <Switch accessibilityLabel={copy(language, key)} value={value} onValueChange={action}
            trackColor={{ true: palette.accent, false: palette.line }} thumbColor={value ? palette.onAccent : palette.surface} />
        </View>
      ))}
      {blocked && <Action palette={palette} onPress={() => void Linking.openSettings().catch(() => {})}>{copy(language, 'notificationsBlocked')}</Action>}
      <Text style={{ color: palette.muted, lineHeight: 19 }}>{copy(language, 'rewardTiming')}</Text>
    </Section>
    <Section title={copy(language, 'sync')} palette={palette}>
      <Text style={{ color: palette.muted, lineHeight: 20 }}>{copy(language, 'syncDetail')}</Text>
      {dashboard.lastCheckedAt !== undefined && <Text style={{ color: palette.text }}>
        {copy(language, 'lastCheck', {
          time: new Date(dashboard.lastCheckedAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }),
        })}
      </Text>}
      <Action palette={palette} disabled={dashboard.refreshing} onPress={() => void dashboard.refresh()}>
        {copy(language, dashboard.refreshing ? 'refreshing' : 'refresh')}
      </Action>
      {dashboard.activity?.kind === 'permission' && <Action palette={palette} primary disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('permission')}>{copy(language, 'connect')}</Action>}
      <Action palette={palette} disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('settings')}>{copy(language, 'permissions')}</Action>
    </Section>
  </>;
}
