export const themes = {
  miku: {
    name: 'Miku',
    accent: '#72F5DD',
    card: '#11282E',
    waitingDrawable: 'miku_waiting',
    happyDrawable: 'miku_happy',
    waiting: require('../modules/anki-activity/android/src/main/res/drawable-nodpi/miku_waiting.png'),
    happy: require('../modules/anki-activity/android/src/main/res/drawable-nodpi/miku_happy.png'),
  },
  '2b': {
    name: '2B',
    accent: '#EFE0C5',
    card: '#2B2926',
    waitingDrawable: 'twob_waiting',
    happyDrawable: 'twob_happy',
    waiting: require('../modules/anki-activity/android/src/main/res/drawable-nodpi/twob_waiting.png'),
    happy: require('../modules/anki-activity/android/src/main/res/drawable-nodpi/twob_happy.png'),
  },
  emilia: {
    name: 'Emilia',
    accent: '#E1BFFF',
    card: '#252038',
    waitingDrawable: 'emilia_waiting',
    happyDrawable: 'emilia_happy',
    waiting: require('../modules/anki-activity/android/src/main/res/drawable-nodpi/emilia_waiting.png'),
    happy: require('../modules/anki-activity/android/src/main/res/drawable-nodpi/emilia_happy.png'),
  },
} as const;

export type WidgetTheme = keyof typeof themes;
export const themeOrder: WidgetTheme[] = ['miku', '2b', 'emilia'];
