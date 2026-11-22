import { useRouter } from 'expo-router';

import { useDashboardContext } from '../../../dashboardContext';
import { copy } from '../../../messages';
import { Screen } from '../../../Screen';
import { WidgetScreen } from '../../../WidgetScreen';

export default function WidgetRoute() {
  const { language } = useDashboardContext();
  const router = useRouter();
  return <Screen title={copy(language, 'widget')}>
    <WidgetScreen openThemes={() => router.push('/widget/themes')}
      openLayouts={(size, widgetId) => router.push({ pathname: '/widget/layouts',
        params: { size, widgetId: widgetId?.toString() } })} />
  </Screen>;
}
