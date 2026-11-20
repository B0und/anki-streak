import { useActor, useSelector } from '@xstate/react';
import { Effect } from 'effect';
import { AppState, Linking, ToastAndroid } from 'react-native';
import { createAsyncLogic, createCallbackLogic, setup, types } from 'xstate';

import {
  getWidgetBackgroundTransparency, getWidgetTheme, openAnki, pinWidget, requestAnkiPermission, setWidgetTheme, type ReviewMood,
} from './activity';
import { copy, type Message } from './messages';
import { appearanceOptions, getLanguage, getWidgetLayouts, languageOptions, preference, settings, type Appearance,
  type LanguagePreference, type WidgetLayout, type WidgetSize } from './preferences';
import type { WidgetTheme } from './themes';
import { changeWidgetBackgroundTransparency, refreshAfterPermissionRequest, refreshWidget,
  republishWidgetAppearance, widgetRefreshActor } from './widgetRefresh';

type AndroidRequest = 'permission' | 'settings' | 'notifications' | 'pin' | 'open';

const androidRequest = Effect.fnUntraced(function*(request: AndroidRequest): Effect.fn.Return<Message | null> {
  switch (request) {
    case 'permission': {
      const response = yield* requestAnkiPermission.pipe(Effect.orElseSucceed(() => null));
      if (!response) return 'permissionError';
      if (!response.granted) {
        if (response.canAskAgain) return 'permission';
        return yield* Effect.tryPromise(() => Linking.openSettings()).pipe(
          Effect.as(null), Effect.orElseSucceed(() => 'settingsError' as const),
        );
      }
      yield* Effect.tryPromise(() => refreshAfterPermissionRequest()).pipe(Effect.ignore);
      return null;
    }
    case 'settings':
      return yield* Effect.tryPromise(() => Linking.openSettings()).pipe(Effect.as(null), Effect.orElseSucceed(() => 'settingsError' as const));
    case 'notifications':
      return yield* Effect.tryPromise(() => settings.openNotificationSettings()).pipe(
        Effect.as(null), Effect.orElseSucceed(() => 'settingsError' as const),
      );
    case 'pin':
      return yield* Effect.tryPromise(() => pinWidget()).pipe(
        Effect.map((result) => result === 'use-picker' ? 'pinFallback' as const : null),
        Effect.orElseSucceed(() => 'pinFallback' as const),
      );
    case 'open':
      return yield* Effect.tryPromise(() => openAnki()).pipe(
        Effect.map((result) => result === 'missing' ? 'missing' as const : null),
        Effect.orElseSucceed(() => 'openError' as const),
      );
  }
});

type DashboardContext = {
  appearance: Appearance;
  languagePreference: LanguagePreference;
  language: ReturnType<typeof getLanguage>;
  layouts: ReturnType<typeof getWidgetLayouts>;
  themeId: WidgetTheme;
  transparency: number;
  previewMood: ReviewMood | null;
  notice: Message | null;
  request: AndroidRequest;
};

function readPreferences(): DashboardContext {
  return {
    appearance: preference('appearance', appearanceOptions, 'system'),
    languagePreference: preference('language', languageOptions, 'system'),
    language: getLanguage(),
    layouts: getWidgetLayouts(),
    themeId: getWidgetTheme(),
    transparency: getWidgetBackgroundTransparency(),
    previewMood: null,
    notice: null,
    request: 'open',
  };
}

const lifecycle = createCallbackLogic({
  run: ({ sendBack }) => {
    const update = (state: string) => sendBack({ type: 'visibility', active: state === 'active', language: getLanguage() });
    const listener = AppState.addEventListener('change', update);
    update(AppState.currentState ?? 'active');
    return () => listener.remove();
  },
});

function requestRefresh() {
  void refreshWidget().catch((error) => console.warn('AnkiDroid refresh failed', error));
}

function manualRefresh() {
  void Effect.runPromise(
    Effect.tryPromise(refreshWidget).pipe(
      Effect.map((activity): Message => activity.kind === 'ready' ? 'refreshSuccess' : activity.kind),
      Effect.orElseSucceed(() => 'refreshError' as const),
      Effect.tap((message) => Effect.sync(() => ToastAndroid.show(copy(getLanguage(), message), ToastAndroid.LONG))),
    ),
  );
}

const dashboardSetup = setup({
  schemas: {
    context: types<DashboardContext>(),
    events: {
      visibility: types<{ active: boolean; language: ReturnType<typeof getLanguage> }>(),
      'appearance.select': types<{ value: Appearance }>(),
      'language.select': types<{ value: LanguagePreference }>(),
      'widget.layout': types<{ size: WidgetSize; value: WidgetLayout }>(),
      'widget.theme': types<{ value: WidgetTheme }>(),
      'widget.transparency': types<{ value: number }>(),
      'widget.preview': types<{ value: ReviewMood | null }>(),
      'anki.refresh': types<void>(),
      'android.request': types<{ request: AndroidRequest }>(),
      'storage.failed': types<{ notice: Message }>(),
    },
  },
});

const dashboardMachine = dashboardSetup.createMachine({
  id: 'dashboard',
  context: readPreferences,
  invoke: { src: lifecycle },
  initial: 'idle',
  on: {
    visibility: ({ context, event }, enq) => {
      enq(event.active ? requestRefresh : republishWidgetAppearance);
      return { context: { ...context, language: event.language } };
    },
    'appearance.select': ({ context, event }, enq) => {
      enq(settings.setPreference, 'appearance', event.value);
      return { context: { ...context, appearance: event.value } };
    },
    'language.select': ({ context, event }, enq) => {
      enq(settings.setPreference, 'language', event.value);
      enq(requestRefresh);
      return { context: { ...context, languagePreference: event.value,
        language: event.value === 'system' ? (settings.getSystemLanguage() === 'ru' ? 'ru' : 'en') : event.value } };
    },
    'widget.layout': ({ context, event }, enq) => {
      enq(settings.setPreference, `layout-${event.size}`, event.value);
      enq(republishWidgetAppearance);
      return { context: { ...context, layouts: { ...context.layouts, [event.size]: event.value } } };
    },
    'widget.theme': ({ context, event, self }, enq) => {
      if (context.themeId === event.value) return;
      enq(() => {
        try {
          setWidgetTheme(event.value);
          republishWidgetAppearance();
        } catch {
          self.send({ type: 'storage.failed', notice: 'themeError' });
        }
      });
      return { context: { ...context, themeId: event.value, notice: null } };
    },
    'widget.transparency': ({ context, event, self }, enq) => {
      enq(() => {
        try {
          changeWidgetBackgroundTransparency(event.value);
        } catch {
          self.send({ type: 'storage.failed', notice: 'transparencyError' });
        }
      });
      return { context: { ...context, transparency: event.value } };
    },
    'widget.preview': ({ context, event }) => ({ context: { ...context, previewMood: event.value } }),
    'storage.failed': ({ context, event }) => ({
      context: { ...context, notice: event.notice, themeId: getWidgetTheme(), transparency: getWidgetBackgroundTransparency() },
    }),
    'anki.refresh': ({ context }, enq) => {
      enq(manualRefresh);
      return { context: { ...context, notice: null } };
    },
  },
  states: {
    idle: {
      on: {
        'android.request': ({ context, event }) => ({
          target: 'requesting', context: { ...context, request: event.request, notice: null },
        }),
      },
    },
    requesting: {
      invoke: dashboardSetup.createInvoke({
        src: createAsyncLogic({ run: ({ input, signal }: { input: AndroidRequest; signal: AbortSignal }) =>
          Effect.runPromise(androidRequest(input), { signal }) }),
        input: ({ context }) => context.request,
        onDone: ({ context, event }) => ({ target: 'idle', context: { ...context, notice: event.output } }),
        onError: { target: 'idle' },
      }),
    },
  },
});

export function useDashboard() {
  const [snapshot, send] = useActor(dashboardMachine);
  const widget = useSelector(widgetRefreshActor, (value) => value);
  const { context } = snapshot;
  const { activity, check, appearanceError, backgroundError } = widget.context;

  return {
    ...context,
    activity,
    initialCheckComplete: check !== null || widget.matches({ data: 'failed' }),
    lastCheckedAt: check?.checkedAt,
    mood: activity?.kind === 'ready' ? activity.mood : 'waiting' as const,
    notice: context.notice ?? (appearanceError ? 'widgetAppearanceFailed' as const
      : widget.matches({ data: 'failed' }) || backgroundError ? 'refreshError' as const
      : check?.activity.kind === 'unavailable' && activity?.kind === 'ready' ? 'unavailable' as const : null),
    refreshing: widget.matches({ data: 'reading' }) || widget.matches({ data: 'publishing' }),
    requesting: snapshot.matches('requesting'),
    clearPreview() { send({ type: 'widget.preview', value: null }); },
    setPreviewMood(value: ReviewMood) { send({ type: 'widget.preview', value }); },
    runAndroidRequest(request: AndroidRequest) { send({ type: 'android.request', request }); },
    selectTheme(value: WidgetTheme) { send({ type: 'widget.theme', value }); },
    changeTransparency(value: number) { send({ type: 'widget.transparency', value }); },
    refresh() { send({ type: 'anki.refresh' }); },
    setLayout(size: WidgetSize, value: WidgetLayout) { send({ type: 'widget.layout', size, value }); },
    setAppearance(value: Appearance) { send({ type: 'appearance.select', value }); },
    setLanguage(value: LanguagePreference) { send({ type: 'language.select', value }); },
  };
}
