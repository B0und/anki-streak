import { Text, View } from 'tamagui';
import { copy, type Language } from './messages';
import { Section } from './studyComponents';
import type { useAppUpdates } from './updateMachine';

export function AppUpdates({ language, updates }: {
  language: Language; updates: ReturnType<typeof useAppUpdates>;
}) {
  const { kind, update, version, canUpdate, check, install } = updates;
  if (!canUpdate) return null;

  const button = (label: string, action: () => void) => (
    <View accessibilityRole="button" onPress={action} self="flex-start" justify="center" minH={44} opacity="press:0.75">
      <Text color="accent" fontSize={14} fontWeight="700">{label}</Text>
    </View>
  );
  const status = (message: string) => (
    <Text accessibilityLiveRegion="polite" color="muted" fontSize={14} lineHeight="20px">{message}</Text>
  );

  if (update) {
    return (
      <Section title={copy(language, 'updates')}>
        <Text color="color">{copy(language, 'updateAvailable', { version: update.version })}</Text>
        {kind === 'checking' && status(copy(language, 'checking'))}
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
    <Section title={copy(language, 'updates')}>
      {status(kind === 'checking' ? copy(language, 'checking') :
        kind === 'check-failed' ? copy(language, 'checkFailed') :
        kind === 'current' ? copy(language, 'upToDate', { version }) : copy(language, 'version', { version }))}
      {kind !== 'checking' && button(copy(language, 'check'), check)}
    </Section>
  );
}
