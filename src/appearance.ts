import type { WidgetTheme } from './themes';

export type Palette = {
  background: string; surface: string; subtle: string; hero: string; line: string;
  text: string; muted: string; accent: string; onAccent: string; heat: string[];
};

const emilia = {
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

export const palettes: Record<WidgetTheme, Record<'light' | 'dark', Palette>> = {
  emilia,
  miku: {
    light: {
      background: '#EEF6F3', surface: '#FAFFFD', subtle: '#DCEFEB', hero: '#CAEAE4',
      line: '#B8D6CE', text: '#123833', muted: '#456B64', accent: '#126B60',
      onAccent: '#FFFFFF', heat: ['#DDECE7', '#ACD9CE', '#76BBA9', '#449988', '#176D61'],
    },
    dark: {
      background: '#0C1D22', surface: '#122A30', subtle: '#1B383C', hero: '#174044',
      line: '#325358', text: '#F0FFFA', muted: '#B1D0C9', accent: '#80EDDA',
      onAccent: '#092B26', heat: ['#223E42', '#28655F', '#297E74', '#49B3A0', '#7BEBD7'],
    },
  },
  '2b': {
    light: {
      background: '#F4EFE7', surface: '#FFFAF2', subtle: '#EDE3D4', hero: '#E9DECB',
      line: '#D5C7B4', text: '#302820', muted: '#695C4F', accent: '#745330',
      onAccent: '#FFFFFF', heat: ['#E8DFD2', '#CDBDA8', '#AE967B', '#927453', '#745330'],
    },
    dark: {
      background: '#211D1A', surface: '#2D2823', subtle: '#3B332A', hero: '#473A2D',
      line: '#584A3C', text: '#FFF6E7', muted: '#D2C4B0', accent: '#F0D7AA',
      onAccent: '#332614', heat: ['#3B342F', '#5B4A38', '#7C6348', '#AA8964', '#E2C49C'],
    },
  },
};
