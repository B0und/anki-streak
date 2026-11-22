export const themes = {
  miku: {
    name: 'Miku',
    source: 'Vocaloid',
    seed: '#72F5DD',
    portraitAspect: { waiting: 1037 / 829, happy: 1063 / 812 },
    waiting: 'miku_waiting',
    happy: 'miku_happy',
  },
  '2b': {
    name: '2B',
    source: 'NieR:Automata',
    seed: '#EFE0C5',
    portraitAspect: { waiting: 732 / 766, happy: 719 / 766 },
    waiting: 'twob_waiting',
    happy: 'twob_happy',
  },
  emilia: {
    name: 'Emilia',
    source: 'Re:Zero',
    seed: '#E1BFFF',
    portraitAspect: { waiting: 733 / 703, happy: 730 / 703 },
    waiting: 'emilia_waiting',
    happy: 'emilia_happy',
  },
} as const;

export type WidgetTheme = keyof typeof themes;
export const themeOrder: WidgetTheme[] = ['miku', '2b', 'emilia'];
