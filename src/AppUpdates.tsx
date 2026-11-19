import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text } from 'react-native';

import type { Palette } from './appearance';
import { copy, type Language } from './messages';
import { Section } from './studyComponents';
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

export function AppUpdates({ palette, language, visible }: { palette: Palette; language: Language; visible: boolean }) {
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

  if (!canUpdate || !visible) return null;

  const button = (label: string, action: () => void) => (
    <Pressable accessibilityRole="button" onPress={action} style={styles.button}>
      <Text style={[styles.buttonLabel, { color: palette.accent }]}>{label}</Text>
    </Pressable>
  );
  const status = (message: string) => (
    <Text accessibilityLiveRegion="polite" style={[styles.detail, { color: palette.muted }]}>{message}</Text>
  );

  if (state.kind === 'available' || state.kind === 'download-failed' || state.kind === 'ready' || state.kind === 'permission' ||
    state.kind === 'downloading' || state.kind === 'opening-installer') {
    return (
      <Section palette={palette} title={copy(language, 'updates')}>
        <Text style={{ color: palette.text }}>{copy(language, 'updateAvailable', { version: state.update.version })}</Text>
        {state.kind === 'download-failed' && status(copy(language, 'updateFailed'))}
        {state.kind === 'downloading' && status(copy(language, 'downloading'))}
        {state.kind === 'opening-installer' && status(copy(language, 'installer'))}
        {state.kind === 'permission' && status(copy(language, 'installPermission'))}
        {(state.kind === 'available' || state.kind === 'download-failed') &&
          button(copy(language, 'downloadInstall'), () => void install(state.update, false))}
        {(state.kind === 'ready' || state.kind === 'permission') &&
          button(copy(language, 'installUpdate'), () => void install(state.update, true))}
      </Section>
    );
  }

  return (
    <Section palette={palette} title={copy(language, 'updates')}>
      {status(state.kind === 'checking' ? copy(language, 'checking') :
        state.kind === 'check-failed' ? copy(language, 'checkFailed') :
        state.kind === 'current' ? copy(language, 'upToDate', { version }) : copy(language, 'version', { version }))}
      {state.kind !== 'checking' && button(copy(language, 'check'), () => void check(true))}
    </Section>
  );
}

const styles = StyleSheet.create({
  detail: { color: '#A4BFC1', fontSize: 14, lineHeight: 20 },
  button: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
  buttonLabel: { fontSize: 14, fontWeight: '700' },
});
