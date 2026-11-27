const mushokuTensei = 'Mushoku Tensei';

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
  rudeus: {
    name: 'Rudeus',
    source: mushokuTensei,
    seed: '#E1BA76',
    portraitAspect: { waiting: 609 / 720, happy: 609 / 720 },
    waiting: 'rudeus_waiting',
    happy: 'rudeus_happy',
  },
  roxy: {
    name: 'Roxy',
    source: mushokuTensei,
    seed: '#9EACFF',
    portraitAspect: { waiting: 719 / 720, happy: 719 / 720 },
    waiting: 'roxy_waiting',
    happy: 'roxy_happy',
  },
  sylphiette: {
    name: 'Sylphiette',
    source: mushokuTensei,
    seed: '#BBD88B',
    portraitAspect: { waiting: 528 / 720, happy: 528 / 720 },
    waiting: 'sylphiette_waiting',
    happy: 'sylphiette_happy',
  },
  eris: {
    name: 'Eris',
    source: mushokuTensei,
    seed: '#FF9C8E',
    portraitAspect: { waiting: 691 / 720, happy: 691 / 720 },
    waiting: 'eris_waiting',
    happy: 'eris_happy',
  },
  ruijerd: {
    name: 'Ruijerd',
    source: mushokuTensei,
    seed: '#80D7AB',
    portraitAspect: { waiting: 720 / 575, happy: 720 / 575 },
    waiting: 'ruijerd_waiting',
    happy: 'ruijerd_happy',
  },
  astolfo: {
    name: 'Astolfo',
    source: 'Fate/Apocrypha',
    seed: '#F3A4C6',
    portraitAspect: { waiting: 720 / 624, happy: 720 / 624 },
    waiting: 'astolfo_waiting',
    happy: 'astolfo_happy',
  },
} as const;

export type WidgetTheme = keyof typeof themes;
export const themeOrder: WidgetTheme[] = [
  'miku', '2b', 'emilia', 'rudeus', 'roxy', 'sylphiette', 'eris', 'ruijerd', 'astolfo',
];
