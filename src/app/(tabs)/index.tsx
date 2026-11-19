import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';

import { celebrationDay } from '../../celebration';
import { useDashboardContext } from '../../dashboardContext';
import { settings } from '../../preferences';
import { Screen } from '../../Screen';
import { TodayScreen } from '../../TodayScreen';

export default function TodayRoute() {
  const { dashboard, palette, language } = useDashboardContext();
  const pathname = usePathname();
  const [celebration, setCelebration] = useState(0);
  const ready = dashboard.activity?.kind === 'ready' ? dashboard.activity : null;

  useEffect(() => {
    if (pathname === '/' && ready?.today && settings.takeCelebration(celebrationDay()) &&
      settings.getPreference('animate') !== 'off') {
      setCelebration((token) => token + 1);
    }
  }, [ready, pathname]);

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(0), 3200);
    return () => clearTimeout(timer);
  }, [celebration]);

  return <Screen title="Anki Streak">
    <TodayScreen dashboard={dashboard} palette={palette} language={language} celebration={celebration} />
  </Screen>;
}
