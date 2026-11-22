import { defaultConfig } from '@tamagui/config/v6';
import { createFont, createTamagui } from 'tamagui';

import type { Palette } from './src/appearance';
import { characterPalettes, mapCharacterThemes } from './src/character-palettes';
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
    light: { ...defaultConfig.themes.light, ...companionTheme(characterPalettes.miku.app.light) },
    dark: { ...defaultConfig.themes.dark, ...companionTheme(characterPalettes.miku.app.dark) },
    ...mapCharacterThemes(companionTheme),
  },
});

export default config;

type AppConfig = typeof config;
declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
