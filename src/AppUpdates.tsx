import { Download } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { copy, type Language } from './messages';
import { SettingsGroup } from './SettingsScreen';
import type { useAppUpdates } from './updateMachine';

export function AppUpdates({ language, updates, accent }: {
  accent: string; language: Language; updates: ReturnType<typeof useAppUpdates>;
}) {
  const { fontScale } = useWindowDimensions();
  const { kind, update, version, canUpdate, check, install, progress } = updates;
  if (!canUpdate) return null;

  const rowHeight = Math.max(58, 52 * fontScale);
  if (kind === 'downloading' && update) {
    const received = progress?.bytesReceived ?? 0;
    const rate = progress?.bytesPerSecond ?? 0;
    const percent = Math.floor(received / update.size * 100);
    const verifying = received === update.size;
    const label = copy(language, verifying ? 'verifyingUpdate' : 'downloading');
    const speed = rate >= 1_000_000
      ? copy(language, 'downloadSpeedMb', { speed: formatMegabytes(rate, language) })
      : copy(language, 'downloadSpeedKb', { speed: Math.round(rate / 1000) });

    return <SettingsGroup title={copy(language, 'updates')} icon={Download} color={accent}>
      <YStack minH={rowHeight} gap={6}>
        <XStack items="center" justify="space-between" gap={8} flexWrap="wrap">
          <Text accessibilityLiveRegion="polite" color="color" fontSize={13} fontWeight="600">{label}</Text>
          <Text color="accent" fontSize={13} fontWeight="700" fontVariant={['tabular-nums']}>{percent}%</Text>
        </XStack>
        <View accessibilityRole="progressbar" accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: 100, now: percent }}
          h={6} rounded={3} overflow="hidden" bg="border-color">
          <View w={`${percent}%`} h="100%" rounded={3} bg="accent" />
        </View>
        <XStack justify="space-between" gap={8} flexWrap="wrap">
          <Text color="muted" fontSize={12} fontVariant={['tabular-nums']}>{copy(language, 'downloadSize', {
            received: formatMegabytes(received, language),
            total: formatMegabytes(update.size, language),
          })}</Text>
          {!verifying && <Text color="muted" fontSize={12} fontVariant={['tabular-nums']}>{speed}</Text>}
        </XStack>
      </YStack>
    </SettingsGroup>;
  }

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
    <XStack items="center" gap={12} h={rowHeight}>
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


function formatMegabytes(bytes: number, language: Language) {
  const value = (bytes / 1_000_000).toFixed(1);
  return language === 'ru' ? value.replace('.', ',') : value;
}
