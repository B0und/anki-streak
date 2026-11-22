import { useLocalSearchParams, useRouter } from 'expo-router';

import { WidgetLayouts } from '../../../WidgetLayouts';

export default function LayoutsRoute() {
  const { size, widgetId } = useLocalSearchParams();
  const router = useRouter();
  return <WidgetLayouts initialSize={size === 'tall' ? 'tall' : 'compact'}
    widgetId={typeof widgetId === 'string' ? Number(widgetId) : null}
    onBack={() => router.canGoBack() ? router.back() : router.replace('/widget')} />;
}
