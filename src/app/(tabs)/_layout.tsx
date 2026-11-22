import { useLingui } from '@lingui/react';
import { Tabs } from 'expo-router/js-tabs';
import { House, PanelsTopLeft, Settings, Trophy } from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppAppearance } from '../../useAppAppearance';
import { UpdatesActorContext } from '../../updateMachine';
import { messages } from '../../messages';
import { screenMaxWidth } from '../../screenLayout';

export default function TabLayout() {
  const { _ } = useLingui();
  const { palette } = useAppAppearance();
  const updateAvailable = UpdatesActorContext.useSelector(({ context }) => context.update !== null);
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
    <Tabs.Screen name="index" options={{ title: _(messages.today), tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
    <Tabs.Screen name="widget" options={{ title: _(messages.widget), tabBarIcon: ({ color, size }) => <PanelsTopLeft color={color} size={size} /> }} />
    <Tabs.Screen name="progress" options={{ title: _(messages.progress), tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }} />
    <Tabs.Screen name="settings" options={{
      title: _(messages.settings),
      tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
      tabBarBadge: updateAvailable ? 1 : undefined,
    }} />
  </Tabs>;
}
