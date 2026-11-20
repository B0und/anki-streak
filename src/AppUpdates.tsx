import { Download } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import { Text, View, XStack } from 'tamagui';

import { copy, type Language } from './messages';
import { SettingsGroup } from './SettingsScreen';
import type { useAppUpdates } from './updateMachine';

export function AppUpdates({ language, updates, accent }: {
  accent: string; language: Language; updates: ReturnType<typeof useAppUpdates>;
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

  return <SettingsGroup title={copy(language, 'updates')} icon={Download} color={accent}>
    <XStack items="center" gap={12} h={Math.max(52, 40 * fontScale)}>
      <Text accessibilityLiveRegion="polite" color="muted" fontSize={13} flex={1} numberOfLines={2}>{status}</Text>
      <View accessibilityRole="button" accessibilityState={{ disabled: busy }}
        onPress={busy ? undefined : update ? install : check}
        w="43%" justify="center" h="100%" opacity={busy ? 0.55 : 'press:0.75'}>
        <Text color="accent" fontSize={13} fontWeight="700" numberOfLines={2} text="right">
          {copy(language, update ? installReady ? 'installUpdate' : 'downloadInstall' : 'check')}
        </Text>
      </View>
    </XStack>
  </SettingsGroup>;
}
