export const palettes = {
  light: {
    background: '#F9F2EB', surface: '#FFFAF5', subtle: '#F2E7F1', hero: '#EDDFEF',
    line: '#DDCBDE', text: '#2A1738', muted: '#6C5873', accent: '#74429C',
    onAccent: '#FFFFFF', heat: ['#EADDED', '#D4B9E6', '#B78BD3', '#9560BB', '#73439C'],
  },
  dark: {
    background: '#19132C', surface: '#27203E', subtle: '#35284E', hero: '#382856',
    line: '#534268', text: '#FCF1FF', muted: '#CEC0DD', accent: '#E0BEFF',
    onAccent: '#291634', heat: ['#382C50', '#5C447C', '#8056AB', '#A171CE', '#D4AAFA'],
  },
};

export type Palette = (typeof palettes)[keyof typeof palettes];
