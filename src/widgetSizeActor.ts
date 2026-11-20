import { Effect, Schema } from 'effect';
import { requireNativeModule } from 'expo';
import { AppState } from 'react-native';
import { createCallbackLogic, setup, types } from 'xstate';

import { widgetSizes, type WidgetSize } from './preferences';

const dimension = Schema.Finite.check(Schema.isGreaterThan(0));
const pinnedSizes = Schema.Array(Schema.Struct({
  size: Schema.Literals(widgetSizes),
  width: dimension,
  height: dimension,
  widgetId: Schema.optional(Schema.Int),
}));

export type WidgetPreviewSize = (typeof pinnedSizes.Type)[number];

export function previewBounds(sizes: readonly WidgetPreviewSize[], widgetId: number | null) {
  return sizes.find((bounds) => bounds.widgetId === widgetId) ?? sizes[0];
}

const { getWidgetPreviewSizes } = requireNativeModule<{
  // oxlint-disable-next-line quality/no-unknown-returns -- Launcher dimensions are decoded at the native boundary.
  getWidgetPreviewSizes(name: string): Promise<unknown>;
}>('ExpoWidgets');

const readSizes = Effect.tryPromise(() => getWidgetPreviewSizes('AnkiStreak')).pipe(
  Effect.flatMap(Schema.decodeUnknownEffect(pinnedSizes)),
);

const observeLauncher = createCallbackLogic({
  run: ({ sendBack }) => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') sendBack({ type: 'resume' });
    });
    return () => listener.remove();
  },
});

type SizeSelection = {
  size: WidgetSize;
  sizes: readonly WidgetPreviewSize[];
  selectedWidgetId: number | null;
  preferPinned: boolean;
};

const sizeSetup = setup({
  schemas: {
    input: types<{ size?: WidgetSize }>(),
    context: types<SizeSelection>(),
    events: {
      resume: types<void>(),
      select: types<{ size: WidgetSize }>(),
      bounds: types<{ widgetId: number }>(),
    },
  },
});

export const widgetSizeActor = sizeSetup.createMachine({
  initial: 'reading',
  context: ({ input }) => ({
    size: input.size ?? 'compact', sizes: [], selectedWidgetId: null, preferPinned: input.size === undefined,
  }),
  invoke: { src: observeLauncher },
  on: {
    resume: { target: '.reading', reenter: true },
    select: ({ context, event }) => ({
      context: { ...context, size: event.size, selectedWidgetId: null, preferPinned: false },
    }),
    bounds: ({ context, event }) => ({
      context: { ...context, selectedWidgetId: event.widgetId },
    }),
  },
  states: {
    reading: {
      invoke: sizeSetup.createInvoke({
        src: ({ signal }): Promise<typeof pinnedSizes.Type> => Effect.runPromise(readSizes, { signal }),
        onDone: ({ context, event }) => {
          const sizes = event.output;
          const currentBounds = previewBounds(context.sizes.filter((bounds) => bounds.size === context.size), context.selectedWidgetId);
          const pinned = sizes.filter((bounds) => bounds.widgetId !== undefined);
          const sameWidget = pinned.find((bounds) => bounds.widgetId === currentBounds?.widgetId);
          const chooseDefault = context.preferPinned && !pinned.some((bounds) => bounds.size === context.size);
          const size = sameWidget?.size ?? (chooseDefault ? pinned[0]?.size : undefined) ?? context.size;
          return { target: 'ready', context: { ...context, sizes, size, selectedWidgetId: sameWidget?.widgetId ?? null } };
        },
        onError: { target: 'unavailable' },
      }),
    },
    ready: {},
    unavailable: {},
  },
});
