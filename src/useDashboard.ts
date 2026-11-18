import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import {
  getWidgetBackgroundTransparency, getWidgetTheme, openAnki, pinWidget, requestPermission, type ReviewMood,
} from './activity';
import type { WidgetTheme } from './themes';
import {
  changeWidgetBackgroundTransparency, changeWidgetTheme, enableBackgroundRefresh, flushWidgetAppearance,
  getWidgetRefreshState, lastCompletedRefresh, refreshAfterPermissionRequest, refreshWidget, subscribeToWidgetRefresh,
} from './widgetRefresh';

type MoodPreview = { kind: 'live' } | { kind: 'preview'; mood: ReviewMood };
type AndroidRequest = 'permission' | 'pin' | 'open';
type RequestState =
  | { kind: 'idle' }
  | { kind: 'running'; request: AndroidRequest }
  | { kind: 'notice'; message: string };

const pinFallback = 'Touch and hold your home screen, then choose Widgets → Anki Streak.';
const refreshError = 'Couldn’t refresh the widget. Try again.';

export function useDashboard() {
  const widget = useSyncExternalStore(subscribeToWidgetRefresh, getWidgetRefreshState);
  const activity = lastCompletedRefresh(widget)?.activity ?? null;
  const [preview, setPreview] = useState<MoodPreview>({ kind: 'live' });
  const [themeId, setThemeId] = useState(getWidgetTheme);
  const [transparency, setTransparency] = useState(getWidgetBackgroundTransparency);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [request, setRequest] = useState<RequestState>({ kind: 'idle' });
  const activeRequest = useRef<RequestState>({ kind: 'idle' });

  const refresh = useCallback(async () => {
    try {
      await refreshWidget();
    } catch {
      // The refresh store retains the prior dashboard and reports the failed phase.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const listener = AppState.addEventListener('change', (status) => {
      if (status === 'active') void refresh();
      else flushWidgetAppearance();
    });
    return () => listener.remove();
  }, [refresh]);

  useEffect(() => {
    if (activity?.kind === 'ready') {
      void enableBackgroundRefresh().catch(() => setFeedback(refreshError));
    }
  }, [activity]);

  function transitionRequest(next: RequestState) {
    activeRequest.current = next;
    setRequest(next);
  }

  async function runAndroidRequest(action: AndroidRequest) {
    if (activeRequest.current.kind === 'running') return;
    transitionRequest({ kind: 'running', request: action });
    setFeedback(null);

    let message: string | undefined;
    switch (action) {
      case 'permission':
        try {
          await requestPermission();
        } catch {
          message = 'Couldn’t open the permission prompt. Check the app’s Android permissions.';
        }
        if (!message) {
          try {
            await refreshAfterPermissionRequest();
          } catch {
            // The refresh state owns failures after the Android prompt.
          }
        }
        break;
      case 'pin':
        try {
          if (await pinWidget() === 'use-picker') message = pinFallback;
        } catch {
          message = pinFallback;
        }
        break;
      case 'open':
        try {
          if (await openAnki() === 'missing') message = 'Install AnkiDroid to open your collection.';
        } catch {
          message = 'Couldn’t open AnkiDroid.';
        }
        break;
    }
    transitionRequest(message ? { kind: 'notice', message } : { kind: 'idle' });
  }

  async function selectTheme(id: WidgetTheme) {
    if (id === getWidgetTheme()) return;
    setFeedback(null);
    if (activeRequest.current.kind === 'notice') transitionRequest({ kind: 'idle' });
    try {
      const update = changeWidgetTheme(id);
      setThemeId(id);
      await update;
    } catch {
      // A later selection can become authoritative while this refresh is in flight.
      const selected = getWidgetTheme();
      setThemeId(selected);
      if (selected === id) setFeedback('Couldn’t update the widget theme. Try refreshing.');
    }
  }

  function changeTransparency(value: number) {
    try {
      changeWidgetBackgroundTransparency(value);
      setTransparency(value);
    } catch {
      setFeedback('Couldn’t update the widget background. Try again.');
    }
  }

  return {
    activity,
    themeId,
    transparency,
    mood: preview.kind === 'preview' ? preview.mood : activity?.kind === 'ready' ? activity.mood : 'waiting',
    preview,
    notice: request.kind === 'notice' ? request.message : feedback ?? (widget.kind === 'failed' ? refreshError : ''),
    refreshing: widget.kind === 'reading' || widget.kind === 'rendering',
    requesting: request.kind === 'running',
    togglePreview(mood: ReviewMood) {
      setPreview((current) => current.kind === 'preview' && current.mood === mood
        ? { kind: 'live' }
        : { kind: 'preview', mood });
    },
    runAndroidRequest,
    selectTheme,
    changeTransparency,
    refresh() {
      setFeedback(null);
      if (activeRequest.current.kind === 'notice') transitionRequest({ kind: 'idle' });
      return refresh();
    },
  };
}
