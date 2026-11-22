import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import Color from 'colorjs.io';

import { themes } from '../src/themes';

const roleColors = {
  widget: {
    accent: '#EFE0C5',
    card: '#2B2926',
    shade: '#231F1D',
    pulse: {
      surface: '#35312D',
      footer: '#2C2926',
      hero: '#F2EBDF',
      label: '#A59986',
      value: '#BFB29D',
    },
  },
  app: {
    light: {
      background: '#F4EFE7',
      surface: '#FFFAF2',
      subtle: '#EDE3D4',
      hero: '#E9DECB',
      line: '#D5C7B4',
      text: '#302820',
      muted: '#695C4F',
      accent: '#745330',
      onAccent: '#FFFFFF',
      heat: ['#E8DFD2', '#CDBDA8', '#AE967B', '#927453', '#745330'],
    },
    dark: {
      background: '#211D1A',
      surface: '#2D2823',
      subtle: '#3B332A',
      hero: '#473A2D',
      line: '#584A3C',
      text: '#FFF6E7',
      muted: '#D2C4B0',
      accent: '#F0D7AA',
      onAccent: '#332614',
      heat: ['#3B342F', '#5B4A38', '#7C6348', '#AA8964', '#E2C49C'],
    },
  },
};
type PaletteSet = typeof roleColors;
const output = new URL('../src/character-palettes.ts', import.meta.url);
const modes = ['light', 'dark'] as const;
const readableContrast = 4.5;

function srgb(lightness: number, chroma: number, hue: number) {
  return new Color('oklch', [lightness, chroma, hue])
    .toGamut({ space: 'srgb', method: 'oklch.c' })
    .to('srgb')
    .toString({ format: 'hex', collapse: false })
    .toUpperCase();
}

function themeFromSeed(seed: string): PaletteSet {
  const [, seedChroma, hue] = new Color(seed).to('oklch').coords;
  const chromaScale = Math.min(1.5, (seedChroma ?? 0) / 0.04);
  const tint = (color: string) => {
    const [lightness, chroma] = new Color(color).to('oklch').coords;
    return srgb(lightness ?? 0, (chroma ?? 0) * chromaScale, hue ?? 0);
  };
  function tintRoles<K extends string>(roles: Record<K, string>) {
    const result = { ...roles };
    for (const role in roles) result[role] = tint(roles[role]);
    return result;
  }
  const tintApp = ({ heat, ...roles }: PaletteSet['app']['light']) => ({ ...tintRoles(roles), heat: heat.map(tint) });
  const { pulse, ...widget } = roleColors.widget;
  return {
    widget: { ...tintRoles(widget), pulse: tintRoles(pulse) },
    app: { light: tintApp(roleColors.app.light), dark: tintApp(roleColors.app.dark) },
  };
}

function verifyPalette(name: string, { widget, app }: PaletteSet) {
  const contrast = (front: string, back: string, label: string, minimum = readableContrast) => {
    const ratio = new Color(front).contrast(back, 'WCAG21');
    assert.ok(ratio >= minimum, `${name} ${label} contrast ${ratio.toFixed(2)} is below ${minimum}:1`);
  };
  const hierarchy = (colors: string[], gaps: number[], label: string) => {
    const lightness = colors.map((color) => new Color(color).to('oklch').coords[0]);
    for (const [index, gap] of gaps.entries()) {
      assert.ok((lightness[index] ?? Number.NaN) - (lightness[index + 1] ?? Number.NaN) >= gap, `${name} ${label} lost its lightness hierarchy`);
    }
  };

  contrast(widget.accent, widget.card, 'widget accent');
  contrast(widget.accent, widget.shade, 'widget disconnected accent');
  const { surface, footer, hero, label, value } = widget.pulse;
  contrast(hero, surface, 'Study Pulse count', 9);
  contrast(label, surface, 'Study Pulse caption');
  contrast(label, footer, 'Study Pulse footer label');
  contrast(value, footer, 'Study Pulse icon and value', 6);
  hierarchy([hero, value, label], [0.1, 0.06], 'Study Pulse text');
  hierarchy([surface, footer], [0.02], 'Study Pulse backgrounds');

  for (const mode of modes) {
    const palette = app[mode];
    for (const background of ['background', 'surface', 'subtle', 'hero'] as const) {
      for (const role of ['text', 'muted', 'accent'] as const) {
        contrast(palette[role], palette[background], `${mode} ${role} on ${background}`);
      }
    }
    contrast(palette.onAccent, palette.accent, `${mode} button text`);
    const tones = [palette.text, palette.muted];
    hierarchy(mode === 'dark' ? tones : tones.reverse(), [0.1], `${mode} app text`);
    const heat = mode === 'dark' ? palette.heat.toReversed() : palette.heat;
    hierarchy(heat, [0.03, 0.03, 0.03, 0.03], `${mode} review history`);
  }
}

const palettes = Object.fromEntries(Object.entries(themes).map(([id, { seed }]) => {
  assert.match(seed, /^#[0-9a-f]{6}$/i, `${id} needs a six-digit sRGB seed`);
  const palette = themeFromSeed(seed);
  verifyPalette(id, palette);
  return [id, palette];
}));

for (const seed of ['#000000', '#808080', '#FFFFFF']) {
  verifyPalette(seed, themeFromSeed(seed));
}
for (let hue = 0; hue < 360; hue += 5) {
  const seed = srgb(0.65, 0.3, hue);
  verifyPalette(seed, themeFromSeed(seed));
}

const themeKeys = Object.keys(palettes).flatMap((id) => modes.map((mode) =>
  `    ${JSON.stringify(`${mode}_${id}`)}: map(characterPalettes[${JSON.stringify(id)}].app.${mode}),`,
));
const generated = `// Generated by bun run palettes:generate.
import type { Palette } from './appearance';

export const characterPalettes = ${JSON.stringify(palettes, null, 2)} as const;

export function mapCharacterThemes<T>(map: (palette: Palette) => T) {
  return {
${themeKeys.join('\n')}
  };
}
`;

if (process.argv.includes('--check')) {
  assert.equal(await readFile(output, 'utf8'), generated, 'Regenerate character palettes with bun run palettes:generate');
} else {
  await writeFile(output, generated);
}

process.stdout.write(`Validated ${Object.keys(palettes).length} character palettes and 75 generated seed colors.\n`);
