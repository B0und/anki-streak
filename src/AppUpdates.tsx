import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { appUpdater, checkForAppUpdate, type AppUpdate } from './appUpdateRelease';

const automaticCheckIntervalMs = 6 * 60 * 60 * 1000;

type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'current' }
  | { kind: 'check-failed' }
  | { kind: 'available'; update: AppUpdate }
  | { kind: 'downloading'; update: AppUpdate }
  | { kind: 'download-failed'; update: AppUpdate }
  | { kind: 'opening-installer'; update: AppUpdate }
  | { kind: 'permission'; update: AppUpdate }
  | { kind: 'ready'; update: AppUpdate };

export function AppUpdates({ accent }: { accent: string }) {
  const [{ version, canUpdate }] = useState(() => appUpdater.getInstalledBuild());
  const [state, setState] = useState<UpdateState>({ kind: 'idle' });
  const busy = useRef(false);
  const lastCheck = useRef(-Infinity);

  const check = useCallback(async (manual: boolean) => {
    if (!canUpdate || busy.current || (!manual && Date.now() - lastCheck.current < automaticCheckIntervalMs)) return;
    busy.current = true;
    lastCheck.current = Date.now();
    if (manual) setState({ kind: 'checking' });
    try {
      const update = await checkForAppUpdate(version);
      if (!update) setState({ kind: 'current' });
      else setState((previous) =>
        (previous.kind === 'ready' || previous.kind === 'permission') && previous.update.digest === update.digest
          ? previous
          : { kind: 'available', update }
      );
    } catch {
      if (manual) setState({ kind: 'check-failed' });
    } finally {
      busy.current = false;
    }
  }, [canUpdate, version]);

  useEffect(() => {
    void check(false);
    const listener = AppState.addEventListener('change', (activity) => {
      if (activity === 'active') void check(false);
    });
    return () => listener.remove();
  }, [check]);

  async function install(update: AppUpdate, alreadyDownloaded: boolean) {
    if (busy.current) return;
    busy.current = true;
    try {
      if (!alreadyDownloaded) {
        setState({ kind: 'downloading', update });
        try {
          await appUpdater.downloadUpdate(update.tag, update.digest, update.size);
        } catch {
          setState({ kind: 'download-failed', update });
          return;
        }
      }

      setState({ kind: 'opening-installer', update });
      if (!appUpdater.canInstallUpdates()) {
        await appUpdater.openInstallSettings();
        setState({ kind: 'permission', update });
        return;
      }

      await appUpdater.installUpdate();
      setState({ kind: 'ready', update });
    } catch {
      setState({ kind: 'download-failed', update });
    } finally {
      busy.current = false;
    }
  }

  if (!canUpdate) return null;

  const button = (label: string, action: () => void) => (
    <Pressable accessibilityRole="button" onPress={action} style={styles.button}>
      <Text style={[styles.buttonLabel, { color: accent }]}>{label}</Text>
    </Pressable>
  );
  const status = (message: string) => (
    <Text accessibilityLiveRegion="polite" style={styles.detail}>{message}</Text>
  );

  if (state.kind === 'available' || state.kind === 'download-failed' || state.kind === 'ready' || state.kind === 'permission' ||
    state.kind === 'downloading' || state.kind === 'opening-installer') {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Anki Streak {state.update.version} available</Text>
        {state.kind === 'download-failed' && status('Couldn’t prepare the update. Try again.')}
        {state.kind === 'downloading' && status('Downloading update…')}
        {state.kind === 'opening-installer' && status('Opening Android installer…')}
        {state.kind === 'permission' && status('Allow installs from Anki Streak in Android settings, then return and tap Install update.')}
        {(state.kind === 'available' || state.kind === 'download-failed') &&
          button('Download and install', () => void install(state.update, false))}
        {(state.kind === 'ready' || state.kind === 'permission') &&
          button('Install update', () => void install(state.update, true))}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {status(state.kind === 'checking' ? 'Checking for updates…' :
        state.kind === 'check-failed' ? 'Couldn’t check for updates. Try again.' :
        state.kind === 'current' ? `Version ${version} is up to date.` : `Version ${version}`)}
      {state.kind !== 'checking' && button('Check for updates', () => void check(true))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6, borderRadius: 17, borderWidth: 1, borderColor: '#25494D',
    backgroundColor: '#0D1E24', paddingHorizontal: 14, paddingTop: 12,
  },
  title: { color: '#F2FEFC', fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  detail: { color: '#A4BFC1', fontSize: 14, lineHeight: 20 },
  button: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
  buttonLabel: { fontSize: 14, fontWeight: '700' },
});
