import { AppUpdates } from '../../AppUpdates';
import { useDashboardContext } from '../../dashboardContext';
import { copy } from '../../messages';
import { Screen } from '../../Screen';
import { SettingsScreen } from '../../SettingsScreen';

export default function SettingsRoute() {
  const preferences = useDashboardContext();
  const { language, updates } = preferences;

  return <Screen title={copy(language, 'settings')}>
    <AppUpdates language={language} updates={updates} />
    <SettingsScreen {...preferences} />
  </Screen>;
}
