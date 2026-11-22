export const themes = {
  miku: {
    name: 'Miku',
    accent: '#72F5DD',
    card: '#11282E',
    widgetShade: '#0D2025',
    pulse: { surface: '#183037', footer: '#12282E', hero: '#E7F3F2', label: '#93AFB1', value: '#B6CDCD' },
    portraitAspect: { waiting: 1037 / 829, happy: 1063 / 812 },
    waiting: 'miku_waiting',
    happy: 'miku_happy',
  },
  '2b': {
    name: '2B',
    accent: '#EFE0C5',
    card: '#2B2926',
    widgetShade: '#231F1D',
    pulse: { surface: '#35312D', footer: '#2C2926', hero: '#F2EBDF', label: '#A29582', value: '#BFB29D' },
    portraitAspect: { waiting: 732 / 766, happy: 719 / 766 },
    waiting: 'twob_waiting',
    happy: 'twob_happy',
  },
  emilia: {
    name: 'Emilia',
    accent: '#E1BFFF',
    card: '#252038',
    widgetShade: '#1E1A2C',
    pulse: { surface: '#2E2940', footer: '#252136', hero: '#F2EBF8', label: '#AEA0BE', value: '#CBBCD9' },
    portraitAspect: { waiting: 733 / 703, happy: 730 / 703 },
    waiting: 'emilia_waiting',
    happy: 'emilia_happy',
  },
} as const;

export type WidgetTheme = keyof typeof themes;
export const themeOrder: WidgetTheme[] = ['miku', '2b', 'emilia'];
