import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { useAppUpdates } from './AppUpdates';
import { palettes } from './appearance';
import {
  appearanceOptions, getLanguage, getWidgetLayouts, languageOptions, preference, settings,
  type Appearance, type LanguagePreference, type WidgetLayout, type WidgetSize,
} from './preferences';
import { useDashboard } from './useDashboard';
import { refreshWidget, republishWidgetAppearance } from './widgetRefresh';

function useDashboardPreferences() {
  const dashboard = useDashboard();
  const updates = useAppUpdates();
  const [appearance, setAppearance] = useState(() => preference('appearance', appearanceOptions, 'system'));
  const [languagePreference, setLanguagePreference] = useState(() => preference('language', languageOptions, 'system'));
  const [language, updateLanguage] = useState(getLanguage);
  const [layouts, setLayouts] = useState(getWidgetLayouts);
  const systemAppearance = useColorScheme();
  const mode = appearance === 'system' ? systemAppearance ?? 'light' : appearance;
  const palette = palettes[dashboard.themeId][mode];

  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') updateLanguage(getLanguage());
    });
    return () => listener.remove();
  }, []);

  return {
    dashboard, updates, language, palette, mode, layouts, appearance, languagePreference,
    setLayout(size: WidgetSize, value: WidgetLayout) {
      settings.setPreference(`layout-${size}`, value);
      setLayouts(getWidgetLayouts());
      republishWidgetAppearance();
    },
    setAppearance(value: Appearance) {
      settings.setPreference('appearance', value);
      setAppearance(value);
    },
    setLanguage(value: LanguagePreference) {
      settings.setPreference('language', value);
      setLanguagePreference(value);
      updateLanguage(getLanguage());
      republishWidgetAppearance();
      void refreshWidget().catch(() => {});
    },
  };
}

const DashboardContext = createContext<ReturnType<typeof useDashboardPreferences> | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  return <DashboardContext value={useDashboardPreferences()}>{children}</DashboardContext>;
}

export function useDashboardContext() {
  const dashboard = use(DashboardContext);
  if (!dashboard) throw new Error('DashboardProvider is missing');
  return dashboard;
}
