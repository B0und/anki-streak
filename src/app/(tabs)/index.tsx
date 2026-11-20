import { useActor, useActorRef } from '@xstate/react';
import { usePathname } from 'expo-router';

import { celebrationMachine, celebrationVisit } from '../../celebrationMachine';
import { useDashboardContext } from '../../dashboardContext';
import { Screen } from '../../Screen';
import { TodayScreen } from '../../TodayScreen';

function CheckCelebration({ visit }: { visit(): void }) {
  useActorRef(celebrationVisit, { input: visit });
  return null;
}

export default function TodayRoute() {
  const { dashboard, palette, language } = useDashboardContext();
  const pathname = usePathname();
  const [celebration, send] = useActor(celebrationMachine);
  const ready = dashboard.activity?.kind === 'ready' ? dashboard.activity : null;

  return <Screen title="Anki Streak">
    {pathname === '/' && !!ready?.today &&
      <CheckCelebration key={dashboard.lastCheckedAt} visit={() => send({ type: 'visit' })} />}
    <TodayScreen dashboard={dashboard} palette={palette} language={language} celebration={Number(celebration.matches('celebrating'))} />
  </Screen>;
}
