import { useActor } from '@xstate/react';
import { createContext, use, type ReactNode } from 'react';
import { createCallbackLogic, setup, types } from 'xstate';

import { settings } from './preferences';
import { newlyEarned, readEarned, type Achievement, type StudyActivity } from './studyProgress';
import { widgetRefreshActor } from './widgetRefresh';

type Unveiling = { kind: 'new'; awards: readonly Achievement[] } | { kind: 'replay'; award: Achievement };

const watchActivity = createCallbackLogic({
  run: ({ sendBack }) => {
    let lastCheck: ReturnType<typeof widgetRefreshActor.getSnapshot>['context']['check'] = null;
    const report = ({ context: { check } }: ReturnType<typeof widgetRefreshActor.getSnapshot>) => {
      if (!check || check === lastCheck) return;
      lastCheck = check;
      if (check.activity.kind === 'ready') sendBack({ type: 'activity', activity: check.activity });
    };
    const subscription = widgetRefreshActor.subscribe(report);
    report(widgetRefreshActor.getSnapshot());
    return () => subscription.unsubscribe();
  },
});

const progressMachine = setup({
  schemas: {
    context: types<{ earned: readonly Achievement[]; unveiling: Unveiling | null }>(),
    events: {
      activity: types<{ activity: StudyActivity }>(),
      replay: types<{ award: Achievement }>(),
      dismiss: types<void>(),
    },
  },
}).createMachine({
  id: 'studyProgress',
  context: () => ({ earned: readEarned(settings.getPreference('earned-achievements')), unveiling: null }),
  initial: 'tracking',
  invoke: { src: watchActivity },
  states: {
    tracking: {
      on: {
        activity: ({ context, event }, enq) => {
          const awards = newlyEarned(event.activity, context.earned);
          if (!awards.length) return;
          const earned = [...context.earned, ...awards];
          enq(settings.setPreference, 'earned-achievements', earned.join(','));
          const pending = context.unveiling?.kind === 'new' ? context.unveiling.awards : [];
          return { context: { earned, unveiling: { kind: 'new', awards: [...pending, ...awards] } } };
        },
        replay: ({ context, event }) => {
          if (!context.earned.includes(event.award) || context.unveiling?.kind === 'new') return;
          return { context: { ...context, unveiling: { kind: 'replay', award: event.award } } };
        },
        dismiss: ({ context }) => ({ context: { ...context, unveiling: null } }),
      },
    },
  },
});

function useProgressActor() {
  const [snapshot, send] = useActor(progressMachine);
  return {
    ...snapshot.context,
    replay(award: Achievement) { send({ type: 'replay', award }); },
    dismiss() { send({ type: 'dismiss' }); },
  };
}

const ProgressContext = createContext<ReturnType<typeof useProgressActor> | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  return <ProgressContext value={useProgressActor()}>{children}</ProgressContext>;
}

export function useProgress() {
  const progress = use(ProgressContext);
  if (!progress) throw new Error('ProgressProvider is missing');
  return progress;
}
