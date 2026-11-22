import { createActorContext } from '@xstate/react';
import { Effect, Option } from 'effect';
import { AppState } from 'react-native';
import { createCallbackLogic, setup, types } from 'xstate';

import { appUpdater, checkForAppUpdate, decodeDownloadProgress, type AppUpdate, type DownloadProgress } from './appUpdateRelease';

const automaticCheckIntervalMs = 5 * 60 * 1000;
type CheckPhase = 'idle' | 'current' | 'check-failed' | 'available' | 'download-failed' | 'permission' | 'ready';

type UpdateContext = {
  version: string;
  canUpdate: boolean;
  lastCheck: number;
  update: AppUpdate | null;
  progress: DownloadProgress | null;
  showPrompt: boolean;
  resume: CheckPhase;
  manual: boolean;
};

const automaticChecks = createCallbackLogic({
  run: ({ sendBack }) => {
    const check = () => sendBack({ type: 'check', manual: false });
    check();
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') check(); });
    // oxlint-disable-next-line no-restricted-globals -- The existing update actor owns this foreground polling interval and clears it on stop.
    const timer = setInterval(() => { if (AppState.currentState === 'active') check(); }, automaticCheckIntervalMs);
    return () => {
      listener.remove();
      // oxlint-disable-next-line no-restricted-globals -- Dispose the polling interval when the actor stops.
      clearInterval(timer);
    };
  },
});

const observeProgress = createCallbackLogic({
  run: ({ sendBack }) => {
    const listener = appUpdater.addListener('downloadProgress', (event) => {
      const sample = decodeDownloadProgress(event);
      if (Option.isSome(sample)) sendBack({ type: 'progress', sample: sample.value });
    });
    return () => listener.remove();
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
    events: {
      check: types<{ manual: boolean }>(),
      install: types<void>(),
      progress: types<{ sample: DownloadProgress }>(),
      dismissPrompt: types<void>(),
    },
  },
});

const updatesMachine = updatesSetup.createMachine({
  id: 'appUpdates',
  context: () => ({
    ...appUpdater.getInstalledBuild(), lastCheck: -Infinity, update: null, progress: null, showPrompt: false,
    manual: false, resume: 'idle',
  }),
  initial: 'idle',
  invoke: { src: automaticChecks },
  on: {
    dismissPrompt: ({ context }) => ({ context: { ...context, showPrompt: false } }),
  },
  states: {
    idle: { on: { check: startCheck('idle') } },
    current: { on: { check: startCheck('current') } },
    'check-failed': { on: { check: startCheck('check-failed') } },
    checking: {
      on: {
        check: ({ context, event }) => {
          if (event.manual) return { context: { ...context, manual: true } };
        },
        install: ({ context }) => {
          if (!context.update) return;
          return { target: context.resume === 'permission' || context.resume === 'ready' ? 'opening-installer' : 'downloading' };
        },
      },
      invoke: updatesSetup.createInvoke({
        schemas: { input: types<string>() },
        src: ({ input, signal }): Promise<AppUpdate | null> => Effect.runPromise(checkForAppUpdate(input), { signal }),
        input: ({ context }) => context.version,
        onDone: ({ context, event }) => {
          const update = event.output;
          if (!update) return { target: 'current', context: { ...context, update, showPrompt: false } };
          return {
            target: context.update?.digest === update.digest ? context.resume : 'available',
            context: { ...context, update,
              showPrompt: context.showPrompt || (!context.manual && context.update?.tag !== update.tag) },
          };
        },
        onError: ({ context }) => ({ target: context.manual && !context.update ? 'check-failed' : context.resume }),
      }),
    },
    available: { on: { check: startCheck('available'), install: { target: 'downloading' } } },
    'download-failed': { on: { check: startCheck('download-failed'), install: { target: 'downloading' } } },
    downloading: {
      entry: ({ context }) => ({ context: { ...context, progress: null } }),
      on: {
        progress: ({ context, event }) => {
          const { sample } = event;
          if (!context.update || sample.tag !== context.update.tag || sample.bytesReceived > context.update.size) return;
          if (context.progress && sample.bytesReceived < context.progress.bytesReceived) return;
          return { context: { ...context, progress: sample } };
        },
      },
      invoke: [{ src: observeProgress }, updatesSetup.createInvoke({
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
      })],
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
        onDone: ({ context, event }) => ({
          target: event.output,
          context: { ...context, showPrompt: event.output === 'permission' && context.showPrompt },
        }),
        onError: { target: 'download-failed' },
      }),
    },
    permission: { on: { check: startCheck('permission'), install: { target: 'opening-installer' } } },
    ready: { on: { check: startCheck('ready'), install: { target: 'opening-installer' } } },
  },
});

export const UpdatesActorContext = createActorContext(updatesMachine);

export function useAppUpdates() {
  const snapshot = UpdatesActorContext.useSelector((value) => value);
  const { send } = UpdatesActorContext.useActorRef();
  const kind = snapshot.value;
  return {
    ...snapshot.context,
    kind,
    check() { send({ type: 'check', manual: true }); },
    install() { send({ type: 'install' }); },
    dismissPrompt() { send({ type: 'dismissPrompt' }); },
  };
}
