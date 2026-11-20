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
  getWidgetPreviewSizes(name: string): unknown;
}>('ExpoWidgets');

const readSizes = Effect.try(() => Schema.decodeUnknownSync(pinnedSizes)(getWidgetPreviewSizes('AnkiStreak'))).pipe(
  Effect.orElseSucceed((): readonly WidgetPreviewSize[] => []),
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
  context: ({ input }) => {
    const sizes = Effect.runSync(readSizes);
    const pinned = sizes.filter((bounds) => bounds.widgetId !== undefined);
    const initialSize = pinned.some((bounds) => bounds.size === 'compact') ? 'compact' : pinned[0]?.size ?? 'compact';
    return { size: input.size ?? initialSize, sizes, selectedWidgetId: null, preferPinned: input.size === undefined };
  },
  invoke: { src: observeLauncher },
  on: {
    resume: ({ context }) => {
      const sizes = Effect.runSync(readSizes);
      if (sizes.length === 0) return;
      const previous = previewBounds(context.sizes.filter((bounds) => bounds.size === context.size), context.selectedWidgetId);
      const pinned = sizes.filter((bounds) => bounds.widgetId !== undefined);
      const sameWidget = pinned.find((bounds) => bounds.widgetId === previous?.widgetId);
      const chooseDefault = context.preferPinned && !pinned.some((bounds) => bounds.size === context.size);
      const size = sameWidget?.size ?? (chooseDefault ? pinned[0]?.size : undefined) ?? context.size;
      return { context: { ...context, sizes, size, selectedWidgetId: sameWidget?.widgetId ?? null } };
    },
    select: ({ context, event }) => ({
      context: { ...context, size: event.size, selectedWidgetId: null, preferPinned: false },
    }),
    bounds: ({ context, event }) => ({
      context: { ...context, selectedWidgetId: event.widgetId },
    }),
  },
});
