import { useActor } from '@xstate/react';
import { Effect } from 'effect';
import { AppState } from 'react-native';
import { createCallbackLogic, setup, types } from 'xstate';

import { getTarget, hasTarget, milestones, preference, settings, type Milestone } from './preferences';

function initialPreferences() {
  const milestone = preference('milestone', milestones, 'firstReview');
  return {
    milestone,
    draft: targetText(milestone),
    notifications: settings.getPreference('notifications') === 'on',
    animate: settings.getPreference('animate') !== 'off',
    hasAccess: settings.getNotificationAccess(),
  };
}

function targetText(milestone: Milestone) {
  return hasTarget(milestone) ? String(getTarget(milestone)) : '';
}

const observePermissions = createCallbackLogic({
  run: ({ sendBack }) => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') sendBack({ type: 'access', allowed: settings.getNotificationAccess() });
    });
    return () => listener.remove();
  },
});

const rewardSetup = setup({
  schemas: {
    context: types<ReturnType<typeof initialPreferences>>(),
    events: {
      milestone: types<{ value: Milestone }>(),
      draft: types<{ value: string }>(),
      finishEditing: types<void>(),
      notifications: types<{ enabled: boolean }>(),
      animate: types<{ enabled: boolean }>(),
      access: types<{ allowed: boolean }>(),
    },
  },
});

const rewards = rewardSetup.createMachine({
  id: 'rewardSettings',
  context: initialPreferences,
  initial: 'editing',
  invoke: { src: observePermissions },
  on: {
    milestone: ({ context, event }, enq) => {
      enq(settings.setPreference, 'milestone', event.value);
      return { context: { ...context, milestone: event.value, draft: targetText(event.value) } };
    },
    draft: ({ context, event }, enq) => {
      if (!hasTarget(context.milestone)) return;
      const draft = event.value.replace(/[^0-9]/g, '').slice(0, 4);
      if (Number(draft) > 0) enq(settings.setPreference, context.milestone, draft);
      return { context: { ...context, draft } };
    },
    finishEditing: ({ context }) => ({ context: { ...context, draft: targetText(context.milestone) } }),
    animate: ({ context, event }, enq) => {
      enq(settings.setPreference, 'animate', event.enabled ? 'on' : 'off');
      return { context: { ...context, animate: event.enabled } };
    },
    access: ({ context, event }) => ({ context: { ...context, hasAccess: event.allowed } }),
  },
  states: {
    editing: {
      on: {
        notifications: ({ context, event }, enq) => {
          enq(settings.setPreference, 'notifications', event.enabled ? 'on' : 'off');
          return {
            target: event.enabled && !context.hasAccess ? 'asking' : 'editing',
            context: { ...context, notifications: event.enabled },
          };
        },
      },
    },
    asking: {
      invoke: rewardSetup.createInvoke({
        src: ({ signal }): Promise<boolean> => Effect.runPromise(
          Effect.tryPromise(() => settings.requestNotificationAccess()).pipe(
            Effect.ignore, Effect.map(() => settings.getNotificationAccess()),
          ), { signal },
        ),
        onDone: ({ context, event }) => ({ target: 'editing', context: { ...context, hasAccess: event.output } }),
        onError: { target: 'editing' },
      }),
      on: {
        notifications: ({ context, event }, enq) => {
          if (event.enabled) return;
          enq(settings.setPreference, 'notifications', 'off');
          return { context: { ...context, notifications: false } };
        },
      },
    },
  },
});

export function useRewardSettings() {
  const [snapshot, send] = useActor(rewards);
  return { ...snapshot.context, blocked: snapshot.context.notifications && !snapshot.context.hasAccess && !snapshot.matches('asking'), send };
}
