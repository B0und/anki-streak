import { useLingui } from '@lingui/react';
import { useRouter } from 'expo-router';


import { messages } from '../../../messages';
import { Screen } from '../../../Screen';
import { WidgetScreen } from '../../../WidgetScreen';

export default function WidgetRoute() {
  const { _ } = useLingui();
  const router = useRouter();
  return <Screen title={_(messages.widget)}>
    <WidgetScreen openThemes={() => router.push('/widget/themes')}
      openLayouts={(size, widgetId) => router.push({ pathname: '/widget/layouts',
        params: { size, widgetId: widgetId?.toString() } })} />
  </Screen>;
}
