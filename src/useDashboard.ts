import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Linking, ToastAndroid } from 'react-native';

import {
  getWidgetBackgroundTransparency, getWidgetTheme, openAnki, pinWidget, requestPermission, type ReviewMood,
} from './activity';
import { copy, type Message } from './messages';
import { getLanguage } from './preferences';
import type { WidgetTheme } from './themes';
import {
  changeWidgetBackgroundTransparency, changeWidgetTheme, enableBackgroundRefresh, flushWidgetAppearance,
  getWidgetRefreshState, lastCompletedRefresh, refreshAfterPermissionRequest, refreshWidget, subscribeToWidgetRefresh,
} from './widgetRefresh';

type MoodPreview = { kind: 'live' } | { kind: 'preview'; mood: ReviewMood };
type AndroidRequest = 'permission' | 'settings' | 'pin' | 'open';
type RequestState =
  | { kind: 'idle' }
  | { kind: 'running'; request: AndroidRequest }
  | { kind: 'notice'; request: AndroidRequest; message: Message };

const pinFallback: Message = 'pinFallback';
const refreshError: Message = 'refreshError';

export function useDashboard() {
  const widget = useSyncExternalStore(subscribeToWidgetRefresh, getWidgetRefreshState);
  const completed = lastCompletedRefresh(widget);
  const activity = completed?.activity ?? null;
  const [preview, setPreview] = useState<MoodPreview>({ kind: 'live' });
  const [themeId, setThemeId] = useState(getWidgetTheme);
  const [transparency, setTransparency] = useState(getWidgetBackgroundTransparency);
  const [feedback, setFeedback] = useState<Message | null>(null);
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

    let message: Message | undefined;
    switch (action) {
      case 'permission':
        try {
          await requestPermission();
        } catch {
          message = 'permissionError';
        }
        if (!message) {
          try {
            await refreshAfterPermissionRequest();
          } catch {
            // The refresh state owns failures after the Android prompt.
          }
        }
        break;
      case 'settings':
        try {
          await Linking.openSettings();
        } catch {
          message = 'settingsError';
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
          if (await openAnki() === 'missing') message = 'missing';
        } catch {
          message = 'openError';
        }
        break;
    }
    transitionRequest(message ? { kind: 'notice', request: action, message } : { kind: 'idle' });
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
      if (selected === id) setFeedback('themeError');
    }
  }

  function changeTransparency(value: number) {
    try {
      changeWidgetBackgroundTransparency(value);
      setTransparency(value);
    } catch {
      setFeedback('transparencyError');
    }
  }

  return {
    activity,
    lastCheckedAt: completed?.checkedAt,
    widgetArtwork: completed?.publication.kind === 'reviews' ? completed.publication : null,
    themeId,
    transparency,
    mood: activity?.kind === 'ready' ? activity.mood : 'waiting',
    preview,
    notice: request.kind === 'notice' ? request.message : feedback ?? (widget.kind === 'failed' ? refreshError : null),
    refreshing: widget.kind === 'reading' || widget.kind === 'rendering',
    requesting: request.kind === 'running',
    clearPreview() { setPreview({ kind: 'live' }); },
    setPreviewMood(mood: ReviewMood) { setPreview({ kind: 'preview', mood }); },
    runAndroidRequest,
    selectTheme,
    changeTransparency,
    async refresh() {
      setFeedback(null);
      if (activeRequest.current.kind === 'notice') transitionRequest({ kind: 'idle' });
      let message: Message;
      try {
        const result = await refreshWidget();
        message = result.kind === 'ready' ? 'refreshSuccess' : result.kind;
      } catch {
        message = 'refreshError';
      }
      ToastAndroid.show(copy(getLanguage(), message), ToastAndroid.LONG);
    },
  };
}
