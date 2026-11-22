import { useColorScheme } from 'react-native';

import { characterPalettes } from './character-palettes';
import { DashboardActorContext } from './dashboardMachine';

export function useAppAppearance() {
  const appearance = DashboardActorContext.useSelector(({ context }) => context.appearance);
  const themeId = DashboardActorContext.useSelector(({ context }) => context.themeId);
  const systemAppearance = useColorScheme();
  const mode = appearance === 'system' ? systemAppearance ?? 'light' : appearance;
  return { mode, palette: characterPalettes[themeId].app[mode] };
}
