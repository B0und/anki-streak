import { Tabs } from 'expo-router/js-tabs';
import { House, PanelsTopLeft, Settings, Trophy } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDashboardContext } from '../../dashboardContext';
import { copy } from '../../messages';
import { screenMaxWidth } from '../../screenLayout';

export default function TabLayout() {
  const { language, palette, updates } = useDashboardContext();
  const { width } = useWindowDimensions();
  const { left, right } = useSafeAreaInsets();
  return <Tabs backBehavior="initialRoute" screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: palette.accent,
    tabBarInactiveTintColor: palette.muted,
    tabBarStyle: {
      backgroundColor: palette.surface,
      borderTopColor: palette.line,
      paddingHorizontal: Math.max(left, right, (width - screenMaxWidth) / 2),
    },
    tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
  }}>
    <Tabs.Screen name="index" options={{ title: copy(language, 'today'), tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
    <Tabs.Screen name="widget" options={{ title: copy(language, 'widget'), tabBarIcon: ({ color, size }) => <PanelsTopLeft color={color} size={size} /> }} />
    <Tabs.Screen name="progress" options={{ title: copy(language, 'progress'), tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }} />
    <Tabs.Screen name="settings" options={{
      title: copy(language, 'settings'),
      tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
      tabBarBadge: updates.update ? 1 : undefined,
    }} />
  </Tabs>;
}
