import { defaultConfig } from '@tamagui/config/v6';
import { createFont, createTamagui } from 'tamagui';

import { palettes, type Palette } from './src/appearance';
import { animations } from './src/tamaguiAnimations';

function companionTheme(palette: Palette) {
  return {
    background: palette.background,
    surface: palette.surface,
    subtle: palette.subtle,
    hero: palette.hero,
    'border-color': palette.line,
    color: palette.text,
    muted: palette.muted,
    accent: palette.accent,
    'on-accent': palette.onAccent,
  };
}

export const config = createTamagui({
  ...defaultConfig,
  animations,
  fonts: {
    ...defaultConfig.fonts,
    display: createFont({ ...defaultConfig.fonts.heading, family: 'serif' }),
  },
  themes: {
    light: { ...defaultConfig.themes.light, ...companionTheme(palettes.miku.light) },
    dark: { ...defaultConfig.themes.dark, ...companionTheme(palettes.miku.dark) },
    light_miku: companionTheme(palettes.miku.light),
    dark_miku: companionTheme(palettes.miku.dark),
    light_2b: companionTheme(palettes['2b'].light),
    dark_2b: companionTheme(palettes['2b'].dark),
    light_emilia: companionTheme(palettes.emilia.light),
    dark_emilia: companionTheme(palettes.emilia.dark),
  },
});

export default config;

type AppConfig = typeof config;
declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
