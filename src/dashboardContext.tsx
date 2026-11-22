import { createContext, use, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { characterPalettes } from './character-palettes';
import { useAppUpdates } from './updateMachine';
import { useDashboard } from './useDashboard';

function useDashboardPreferences() {
  const dashboard = useDashboard();
  const updates = useAppUpdates();
  const systemAppearance = useColorScheme();
  const { appearance, language, languagePreference, layouts, setLayout, setAppearance, setLanguage } = dashboard;
  const mode = appearance === 'system' ? systemAppearance ?? 'light' : appearance;
  const palette = characterPalettes[dashboard.themeId].app[mode];

  return { dashboard, updates, language, palette, mode, layouts, appearance, languagePreference, setLayout, setAppearance, setLanguage };
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
