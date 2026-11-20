import { AccessibilityInfo } from 'react-native';
import { createCallbackLogic, setup, types } from 'xstate';

type CountInput = { value: number; delay: number };
const duration = 620;

const frames = createCallbackLogic({
  schemas: { input: types<CountInput>() },
  run: ({ input: { value, delay }, sendBack }) => {
    let running = true;
    let frame = 0;
    // oxlint-disable-next-line no-restricted-globals -- The existing animation actor owns this timer handle and clears it on stop.
    let timer: ReturnType<typeof setTimeout> | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!running) return;
      if (reduced) {
        sendBack({ type: 'complete' });
        return;
      }
      sendBack({ type: 'frame', value: 0 });
      // oxlint-disable-next-line no-restricted-globals -- The existing animation delay precedes the frame loop and is cleared on actor stop.
      timer = setTimeout(() => {
        const begin = Date.now();
        const step = () => {
          const progress = Math.min(1, (Date.now() - begin) / duration);
          sendBack({ type: 'frame', value: Math.round(value * (1 - (1 - progress) ** 3)) });
          if (progress === 1) sendBack({ type: 'complete' });
          else frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      }, delay);
    }).catch(() => { if (running) sendBack({ type: 'complete' }); });
    return () => {
      running = false;
      // oxlint-disable-next-line no-restricted-globals -- Dispose the animation delay when the actor stops.
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  },
});

const countUpSetup = setup({
  schemas: {
    input: types<CountInput>(),
    context: types<{ input: CountInput; value: number }>(),
    events: { frame: types<{ value: number }>(), complete: types<void>() },
  },
});

export const countUpMachine = countUpSetup.createMachine({
  id: 'countUp',
  context: ({ input }) => ({ input, value: input.value }),
  initial: 'counting',
  states: {
    counting: {
      invoke: { src: frames, input: ({ context }) => context.input },
      on: {
        frame: ({ context, event }) => ({ context: { ...context, value: event.value } }),
        complete: { target: 'done' },
      },
    },
    done: { type: 'final' },
  },
});
