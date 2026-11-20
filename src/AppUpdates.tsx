import { Pressable, StyleSheet, Text } from 'react-native';

import type { Palette } from './appearance';
import { copy, type Language } from './messages';
import { Section } from './studyComponents';
import type { useAppUpdates } from './updateMachine';

export function AppUpdates({ palette, language, updates }: {
  palette: Palette; language: Language; updates: ReturnType<typeof useAppUpdates>;
}) {
  const { kind, update, version, canUpdate, check, install } = updates;
  if (!canUpdate) return null;

  const button = (label: string, action: () => void) => (
    <Pressable accessibilityRole="button" onPress={action} style={styles.button}>
      <Text style={[styles.buttonLabel, { color: palette.accent }]}>{label}</Text>
    </Pressable>
  );
  const status = (message: string) => (
    <Text accessibilityLiveRegion="polite" style={[styles.detail, { color: palette.muted }]}>{message}</Text>
  );

  if (update) {
    return (
      <Section palette={palette} title={copy(language, 'updates')}>
        <Text style={{ color: palette.text }}>{copy(language, 'updateAvailable', { version: update.version })}</Text>
        {kind === 'download-failed' && status(copy(language, 'updateFailed'))}
        {kind === 'downloading' && status(copy(language, 'downloading'))}
        {kind === 'opening-installer' && status(copy(language, 'installer'))}
        {kind === 'permission' && status(copy(language, 'installPermission'))}
        {(kind === 'available' || kind === 'download-failed') &&
          button(copy(language, 'downloadInstall'), install)}
        {(kind === 'ready' || kind === 'permission') &&
          button(copy(language, 'installUpdate'), install)}
      </Section>
    );
  }

  return (
    <Section palette={palette} title={copy(language, 'updates')}>
      {status(kind === 'checking' ? copy(language, 'checking') :
        kind === 'check-failed' ? copy(language, 'checkFailed') :
        kind === 'current' ? copy(language, 'upToDate', { version }) : copy(language, 'version', { version }))}
      {kind !== 'checking' && button(copy(language, 'check'), check)}
    </Section>
  );
}

const styles = StyleSheet.create({
  detail: { color: '#A4BFC1', fontSize: 14, lineHeight: 20 },
  button: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
  buttonLabel: { fontSize: 14, fontWeight: '700' },
});
