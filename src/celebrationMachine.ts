import { createCallbackLogic, createMachine, types } from 'xstate';

import { celebrationDay } from './celebration';
import { settings } from './preferences';

export const celebrationMachine = createMachine({
  id: 'celebration',
  schemas: { events: { visit: types<void>() } },
  initial: 'waiting',
  states: {
    waiting: {
      on: {
        visit: () => settings.getPreference('animate') !== 'off' && settings.takeCelebration(celebrationDay())
          ? { target: 'celebrating' }
          : undefined,
      },
    },
    celebrating: { after: { 3200: { target: 'waiting' } } },
  },
});

export const celebrationVisit = createCallbackLogic({
  schemas: { input: types<() => void>() },
  run: ({ input }) => { input(); },
});
