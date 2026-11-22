type HexColor = `#${string}`;

export type Palette = {
  background: string; surface: string; subtle: string; hero: string; line: string;
  text: string; muted: string; accent: string; onAccent: string; heat: readonly HexColor[];
};
