export const themes = {
  miku: {
    name: 'Miku',
    accent: '#72F5DD',
    card: '#11282E',
    portraitAspect: { waiting: 1037 / 829, happy: 1063 / 812 },
    waiting: 'miku_waiting',
    happy: 'miku_happy',
  },
  '2b': {
    name: '2B',
    accent: '#EFE0C5',
    card: '#2B2926',
    portraitAspect: { waiting: 732 / 766, happy: 719 / 766 },
    waiting: 'twob_waiting',
    happy: 'twob_happy',
  },
  emilia: {
    name: 'Emilia',
    accent: '#E1BFFF',
    card: '#252038',
    portraitAspect: { waiting: 733 / 703, happy: 730 / 703 },
    waiting: 'emilia_waiting',
    happy: 'emilia_happy',
  },
} as const;

export type WidgetTheme = keyof typeof themes;
export const themeOrder: WidgetTheme[] = ['miku', '2b', 'emilia'];
