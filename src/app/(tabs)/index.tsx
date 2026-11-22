import { useActor, useActorRef } from '@xstate/react';
import { usePathname } from 'expo-router';

import { celebrationMachine, celebrationVisit } from '../../celebrationMachine';
import { useDashboard } from '../../dashboardMachine';
import { useAppAppearance } from '../../useAppAppearance';
import { Screen } from '../../Screen';
import { TodayScreen } from '../../TodayScreen';

function CheckCelebration({ visit }: { visit(): void }) {
  useActorRef(celebrationVisit, { input: visit });
  return null;
}

export default function TodayRoute() {
  const dashboard = useDashboard();
  const { palette, mode } = useAppAppearance();
  const pathname = usePathname();
  const [celebration, send] = useActor(celebrationMachine);
  const ready = dashboard.activity?.kind === 'ready' ? dashboard.activity : null;

  return <Screen title="Anki Streak">
    {pathname === '/' && !!dashboard.lastCheckedAt && !!ready?.today &&
      <CheckCelebration key={dashboard.lastCheckedAt} visit={() => send({ type: 'visit' })} />}
    <TodayScreen dashboard={dashboard} palette={palette}
      stampInk={mode === 'dark' ? '#FF927D' : '#9F2D26'} celebration={Number(celebration.matches('celebrating'))} />
  </Screen>;
}
