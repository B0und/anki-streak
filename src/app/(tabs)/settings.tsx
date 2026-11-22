import { useLingui } from '@lingui/react';
import { AppUpdates } from '../../AppUpdates';
import { messages } from '../../messages';
import { Screen } from '../../Screen';
import { SettingsScreen } from '../../SettingsScreen';

export default function SettingsRoute() {
  const { _ } = useLingui();
  return <Screen title={_(messages.settings)}>
    <AppUpdates />
    <SettingsScreen />
  </Screen>;
}
