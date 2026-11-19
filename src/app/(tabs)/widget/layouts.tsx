import { useLocalSearchParams, useRouter } from 'expo-router';

import { useDashboardContext } from '../../../dashboardContext';
import { copy } from '../../../messages';
import { Screen } from '../../../Screen';
import { WidgetLayouts } from '../../../WidgetLayouts';

export default function LayoutsRoute() {
  const { language } = useDashboardContext();
  const { size } = useLocalSearchParams();
  const router = useRouter();
  return <Screen title={copy(language, 'widgetLayouts')} onBack={() => router.canGoBack() ? router.back() : router.replace('/widget')}>
    <WidgetLayouts initialSize={size === 'tall' ? 'tall' : 'compact'} />
  </Screen>;
}
