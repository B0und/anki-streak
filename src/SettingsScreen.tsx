import { useState } from 'react';
import { Linking, Pressable, Switch, Text, TextInput, View } from 'react-native';

import type { Palette } from './appearance';
import { copy, type Language } from './messages';
import {
  appearanceOptions, getTarget, hasTarget, languageOptions, milestones, preference, settings,
  type Appearance, type LanguagePreference, type Milestone,
} from './preferences';
import { Action, Choices, Section } from './studyComponents';
import type { useDashboard } from './useDashboard';

export function SettingsScreen({ palette, language, appearance, setAppearance, languagePreference, setLanguage, dashboard }: {
  palette: Palette; language: Language; appearance: Appearance; setAppearance(value: Appearance): void;
  languagePreference: LanguagePreference; setLanguage(value: LanguagePreference): void;
  dashboard: ReturnType<typeof useDashboard>;
}) {
  const [milestone, setMilestone] = useState(() => preference('milestone', milestones, 'firstReview'));
  const [draft, setDraft] = useState(() => hasTarget(milestone) ? String(getTarget(milestone)) : '');
  const [notifications, setNotifications] = useState(() => settings.getPreference('notifications') === 'on');
  const [animate, setAnimate] = useState(() => settings.getPreference('animate') !== 'off');
  const [blocked, setBlocked] = useState(() => notifications && !settings.getNotificationAccess());

  function selectMilestone(value: Milestone) {
    settings.setPreference('milestone', value);
    setMilestone(value);
    setDraft(hasTarget(value) ? String(getTarget(value)) : '');
  }

  async function toggleNotifications(value: boolean) {
    setNotifications(value);
    settings.setPreference('notifications', value ? 'on' : 'off');
    if (!value) {
      setBlocked(false);
      return;
    }
    if (!settings.getNotificationAccess()) {
      await settings.requestNotificationAccess().catch(() => {});
      setBlocked(!settings.getNotificationAccess());
    }
  }

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
          onPress={() => selectMilestone(key)} style={{
            minHeight: 44, padding: 8, gap: 9, flexDirection: 'row', alignItems: 'center',
            borderRadius: 9, backgroundColor: milestone === key ? palette.subtle : palette.surface,
          }}>
          <Text style={{ color: palette.accent }}>{milestone === key ? '◉' : '○'}</Text>
          <Text style={{ color: palette.text, flex: 1 }}>{copy(language, key)}</Text>
        </Pressable>
      ))}
      {hasTarget(milestone) && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ color: palette.text, flex: 1 }}>{copy(language, 'targetInput')}</Text>
        <TextInput accessibilityLabel={copy(language, 'targetInput')} value={draft} maxLength={4}
          keyboardType="number-pad" selectTextOnFocus
          style={{ minHeight: 44, minWidth: 66, paddingHorizontal: 9, textAlign: 'center',
            borderColor: palette.line, borderWidth: 1, borderRadius: 9, color: palette.text }}
          onChangeText={(value) => {
            const digits = value.replace(/[^0-9]/g, '');
            setDraft(digits);
            if (Number(digits) > 0) settings.setPreference(milestone, digits);
          }}
          onBlur={() => setDraft(String(getTarget(milestone)))} />
      </View>}
      {([
        ['notifications', notifications, (value: boolean) => void toggleNotifications(value)],
        ['animate', animate, (value: boolean) => {
          setAnimate(value);
          settings.setPreference('animate', value ? 'on' : 'off');
        }],
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
    <Section title="AnkiDroid" palette={palette}>
      {dashboard.activity?.kind === 'permission' && <Action palette={palette} primary disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('permission')}>{copy(language, 'connect')}</Action>}
      <Action palette={palette} disabled={dashboard.requesting}
        onPress={() => void dashboard.runAndroidRequest('settings')}>{copy(language, 'permissions')}</Action>
    </Section>
  </>;
}
