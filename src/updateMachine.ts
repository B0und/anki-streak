import { useActor } from '@xstate/react';
import { Effect } from 'effect';
import { AppState } from 'react-native';
import { createCallbackLogic, setup, types } from 'xstate';

import { appUpdater, checkForAppUpdate, type AppUpdate } from './appUpdateRelease';

const automaticCheckIntervalMs = 5 * 60 * 1000;
type CheckPhase = 'idle' | 'current' | 'check-failed' | 'available' | 'download-failed' | 'permission' | 'ready';

type UpdateContext = {
  version: string;
  canUpdate: boolean;
  lastCheck: number;
  update: AppUpdate | null;
  dismissed: string | null;
  resume: CheckPhase;
  manual: boolean;
};

const automaticChecks = createCallbackLogic({
  run: ({ sendBack }) => {
    const check = () => sendBack({ type: 'check', manual: false });
    check();
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') check(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') check(); }, automaticCheckIntervalMs);
    return () => { listener.remove(); clearInterval(timer); };
  },
});

function startCheck(resume: CheckPhase) {
  return ({ context, event }: { context: UpdateContext; event: { manual: boolean } }) => {
    const now = Date.now();
    if (!context.canUpdate || (!event.manual && now - context.lastCheck < automaticCheckIntervalMs)) return;
    return { target: 'checking' as const, context: { ...context, lastCheck: now, resume, manual: event.manual } };
  };
}

const updatesSetup = setup({
  schemas: {
    context: types<UpdateContext>(),
    events: { check: types<{ manual: boolean }>(), install: types<void>(), dismiss: types<{ digest: string }>() },
  },
});

const updatesMachine = updatesSetup.createMachine({
  id: 'appUpdates',
  context: () => ({
    ...appUpdater.getInstalledBuild(), lastCheck: -Infinity, update: null, dismissed: null, manual: false, resume: 'idle',
  }),
  initial: 'idle',
  invoke: { src: automaticChecks },
  on: {
    dismiss: ({ context, event }) => ({ context: { ...context, dismissed: event.digest } }),
  },
  states: {
    idle: { on: { check: startCheck('idle') } },
    current: { on: { check: startCheck('current') } },
    'check-failed': { on: { check: startCheck('check-failed') } },
    checking: {
      invoke: updatesSetup.createInvoke({
        schemas: { input: types<string>() },
        src: ({ input, signal }): Promise<AppUpdate | null> => Effect.runPromise(checkForAppUpdate(input), { signal }),
        input: ({ context }) => context.version,
        onDone: ({ context, event }) => ({
          target: !event.output ? 'current' : context.update?.digest === event.output.digest ? context.resume : 'available',
          context: { ...context, update: event.output },
        }),
        onError: ({ context }) => ({ target: context.manual && !context.update ? 'check-failed' : context.resume }),
      }),
    },
    available: { on: { check: startCheck('available'), install: { target: 'downloading' } } },
    'download-failed': { on: { check: startCheck('download-failed'), install: { target: 'downloading' } } },
    downloading: {
      invoke: updatesSetup.createInvoke({
        schemas: { input: types<AppUpdate | null>() },
        src: ({ input, signal }) => Effect.runPromise(
          Effect.tryPromise(() => {
            if (!input) throw new Error('Missing release');
            return appUpdater.downloadUpdate(input.tag, input.digest, input.size);
          }), { signal },
        ),
        input: ({ context }) => context.update,
        onDone: { target: 'opening-installer' },
        onError: { target: 'download-failed' },
      }),
    },
    'opening-installer': {
      invoke: updatesSetup.createInvoke({
        src: ({ signal }): Promise<'ready' | 'permission'> => Effect.runPromise(Effect.gen(function*() {
          if (!appUpdater.canInstallUpdates()) {
            yield* Effect.tryPromise(() => appUpdater.openInstallSettings());
            return 'permission';
          }
          yield* Effect.tryPromise(() => appUpdater.installUpdate());
          return 'ready';
        }), { signal }),
        onDone: ({ event }) => ({ target: event.output }),
        onError: { target: 'download-failed' },
      }),
    },
    permission: { on: { check: startCheck('permission'), install: { target: 'opening-installer' } } },
    ready: { on: { check: startCheck('ready'), install: { target: 'opening-installer' } } },
  },
});

export function useAppUpdates() {
  const [snapshot, send] = useActor(updatesMachine);
  const kind = snapshot.matches('checking') && !snapshot.context.manual ? snapshot.context.resume : snapshot.value;
  return {
    ...snapshot.context,
    kind,
    check() { send({ type: 'check', manual: true }); },
    install() { send({ type: 'install' }); },
    dismiss(digest: string) { send({ type: 'dismiss', digest }); },
  };
}
