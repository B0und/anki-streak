import { useLocalSearchParams } from 'expo-router';

import { AppUpdates } from '../../AppUpdates';
import { useDashboardContext } from '../../dashboardContext';
import { copy } from '../../messages';
import { Screen } from '../../Screen';
import { SettingsScreen } from '../../SettingsScreen';

export default function SettingsRoute() {
  const { update } = useLocalSearchParams<{ update?: string }>();
  const preferences = useDashboardContext();
  const { palette, language, updates } = preferences;
  const available = Boolean(updates.update);
  const updateSection = <AppUpdates palette={palette} language={language} updates={updates} />;

  return <Screen key={update} title={copy(language, 'settings')}>
    {available && updateSection}
    <SettingsScreen {...preferences} />
    {!available && updateSection}
  </Screen>;
}
