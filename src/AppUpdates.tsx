import { useWindowDimensions } from 'react-native';
import { Text, View } from 'tamagui';

import { copy, type Language } from './messages';
import { Section } from './studyComponents';
import type { useAppUpdates } from './updateMachine';

export function AppUpdates({ language, updates }: {
  language: Language; updates: ReturnType<typeof useAppUpdates>;
}) {
  const { fontScale } = useWindowDimensions();
  const { kind, update, version, canUpdate, check, install } = updates;
  if (!canUpdate) return null;

  const busy = kind === 'checking' || kind === 'downloading' || kind === 'opening-installer';
  const installReady = kind === 'ready' || kind === 'permission';
  const status = kind === 'checking' ? copy(language, 'checking')
    : kind === 'download-failed' ? copy(language, 'updateFailed')
    : kind === 'downloading' ? copy(language, 'downloading')
    : kind === 'opening-installer' ? copy(language, 'installer')
    : kind === 'permission' ? copy(language, 'installPermission')
    : kind === 'check-failed' ? copy(language, 'checkFailed')
    : update ? copy(language, 'updateAvailable', { version: update.version })
    : copy(language, kind === 'current' ? 'upToDate' : 'version', { version });

  return <Section title={copy(language, 'updates')}>
    <Text accessibilityLiveRegion="polite" color="muted" fontSize={14} lineHeight="20px"
      numberOfLines={3} style={{ height: 60 * fontScale, includeFontPadding: false }}>{status}</Text>
    <View accessibilityRole="button" accessibilityState={{ disabled: busy }}
      onPress={busy ? undefined : update ? install : check}
      self="flex-start" justify="center" h={Math.max(44, 38 * fontScale)} opacity={busy ? 0.55 : 'press:0.75'}>
      <Text color="accent" fontSize={14} fontWeight="700" numberOfLines={2}>
        {copy(language, update ? installReady ? 'installUpdate' : 'downloadInstall' : 'check')}
      </Text>
    </View>
  </Section>;
}
