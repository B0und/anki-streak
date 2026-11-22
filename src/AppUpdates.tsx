import { useLingui } from '@lingui/react';
import { Download } from 'lucide-react-native';
import { Modal, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import type { AppUpdate, DownloadProgress } from './appUpdateRelease';
import { messages } from './messages';
import { SettingsGroup } from './SettingsScreen';
import { Action } from './studyComponents';
import { useAppUpdates } from './updateMachine';
import { useAppAppearance } from './useAppAppearance';

export function AppUpdates() {
  const { _ } = useLingui();
  const { fontScale } = useWindowDimensions();
  const { palette: { accent } } = useAppAppearance();
  const { kind, update, version, canUpdate, check, install, progress } = useAppUpdates();
  if (!canUpdate) return null;

  const rowHeight = Math.max(58, 52 * fontScale);
  if (kind === 'downloading' && update) {
    return <SettingsGroup title={_(messages.updates)} icon={Download} color={accent}>
      <YStack minH={rowHeight}><UpdateDownloadProgress update={update} progress={progress} /></YStack>
    </SettingsGroup>;
  }

  const busy = kind === 'checking' || kind === 'downloading' || kind === 'opening-installer';
  const installReady = kind === 'ready' || kind === 'permission';
  const status = kind === 'checking' ? _(messages.checking)
    : kind === 'download-failed' ? _(messages.updateFailed)
    : kind === 'downloading' ? _(messages.downloading)
    : kind === 'opening-installer' ? _(messages.installer)
    : kind === 'permission' ? _(messages.installPermission)
    : kind === 'check-failed' ? _(messages.checkFailed)
    : update ? _(messages.updateAvailable.id, { version: update.version })
    : _(messages[kind === 'current' ? 'upToDate' : 'version'].id, { version });

  return <SettingsGroup title={_(messages.updates)} icon={Download} color={accent}>
    <XStack items="center" gap={12} h={rowHeight}>
      <Text accessibilityLiveRegion="polite" color="muted" fontSize={13} flex={1} numberOfLines={2}>{status}</Text>
      <View accessibilityRole="button" accessibilityState={{ disabled: busy }}
        onPress={busy ? undefined : update ? install : check}
        w="43%" justify="center" h="100%" opacity={busy ? 0.55 : 'press:0.75'}>
        <Text color="accent" fontSize={13} fontWeight="700" numberOfLines={2} text="right">
          {_(messages[update ? installReady ? 'installUpdate' : 'downloadInstall' : 'check'])}
        </Text>
      </View>
    </XStack>
  </SettingsGroup>;
}

export function UpdatePrompt() {
  const { _, i18n } = useLingui();
  const { kind, update, progress, install, dismissPrompt } = useAppUpdates();
  if (!update) return null;

  const busy = kind === 'downloading' || kind === 'opening-installer';
  const detail = kind === 'download-failed' ? _(messages.updateFailed)
    : kind === 'opening-installer' ? _(messages.installer)
    : kind === 'permission' ? _(messages.installPermission)
    : _(messages.updatePromptSize.id, { size: formatMegabytes(update.size, i18n.locale) });
  const action = kind === 'permission' || kind === 'ready' ? 'installUpdate'
    : kind === 'download-failed' ? 'retryUpdate' : 'downloadInstall';

  return <Modal transparent visible onRequestClose={dismissPrompt} animationType="fade"
    statusBarTranslucent navigationBarTranslucent>
    <ScrollView style={styles.scrim} contentContainerStyle={styles.dialogFrame} bounces={false}>
      <YStack accessibilityViewIsModal w="100%" maxW={380} bg="surface" rounded={24} p={24} gap={16}>
        <Text accessibilityRole="header" color="color" fontSize={22} fontWeight="700">
          {_(messages.updateAvailable.id, { version: update.version })}
        </Text>
        {kind === 'downloading' ? <UpdateDownloadProgress update={update} progress={progress} />
          : <Text accessibilityLiveRegion="polite" color="muted" fontSize={15}>{detail}</Text>}
        <YStack gap={8}>
          {!busy && <Action primary onPress={install}>{_(messages[action])}</Action>}
          <Action onPress={dismissPrompt}>{_(messages[busy ? 'closeUpdatePrompt' : 'updateLater'])}</Action>
        </YStack>
      </YStack>
    </ScrollView>
  </Modal>;
}

function UpdateDownloadProgress({ update, progress }: { update: AppUpdate; progress: DownloadProgress | null }) {
  const { _, i18n } = useLingui();
  const received = progress?.bytesReceived ?? 0;
  const rate = progress?.bytesPerSecond ?? 0;
  const percent = Math.floor(received / update.size * 100);
  const verifying = received === update.size;
  const label = _(messages[verifying ? 'verifyingUpdate' : 'downloading']);
  const speed = rate >= 1_000_000
    ? _(messages.downloadSpeedMb.id, { speed: formatMegabytes(rate, i18n.locale) })
    : _(messages.downloadSpeedKb.id, { speed: Math.round(rate / 1000) });

  return <YStack gap={6}>
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
      <Text color="muted" fontSize={12} fontVariant={['tabular-nums']}>{_(messages.downloadSize.id, {
        received: formatMegabytes(received, i18n.locale),
        total: formatMegabytes(update.size, i18n.locale),
      })}</Text>
      {!verifying && <Text color="muted" fontSize={12} fontVariant={['tabular-nums']}>{speed}</Text>}
    </XStack>
  </YStack>;
}

function formatMegabytes(bytes: number, locale: string) {
  return (bytes / 1_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.58)' },
  dialogFrame: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
});
