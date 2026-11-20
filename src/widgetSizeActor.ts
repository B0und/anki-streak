import { createStepLogic } from 'xstate';

import type { WidgetSize } from './preferences';

export const widgetSizeActor = createStepLogic<WidgetSize, never, { type: 'select'; size: WidgetSize }, WidgetSize>({
  context: ({ input }) => input,
  run: ({ event }) => event.type === 'select' ? { context: event.size } : undefined,
});
