/**
 * Palette and type of the "hologram wireframe / X-ray" style. Every holo component takes a theme,
 * so another subject can recolour the whole video with `withTheme({primary: …})`.
 */
export type HoloTheme = {
  /** Background behind the 3D scene. */
  bg: string;
  /** Ground grid lines. */
  grid: string;
  /** Main neon (wireframes, current at rest). */
  primary: string;
  /** Second neon (living things, positive readings). */
  secondary: string;
  /** Danger: short circuit, arcs, alerts. */
  danger: string;
  /** Warnings and highlighted numbers. */
  warn: string;
  /** Plain text on the HUD. */
  text: string;
  /** Monospace stack (system fonts: nothing to download). */
  font: string;
  /** Global multiplier of the additive glow (0 = flat lines). */
  glow: number;
};

export const HOLO_DEFAULT: HoloTheme = {
  bg: '#000308',
  grid: '#003344',
  primary: '#00f0ff',
  secondary: '#00ffa6',
  danger: '#ff3b5c',
  warn: '#ffd23f',
  text: '#e6fbff',
  font: '"JetBrains Mono", "Share Tech Mono", "Cascadia Mono", Consolas, "DejaVu Sans Mono", monospace',
  glow: 1,
};

export const withTheme = (over: Partial<HoloTheme> = {}): HoloTheme => ({...HOLO_DEFAULT, ...over});

/** CSS glow for a neon text of colour `c`. */
export const neonShadow = (c: string, k = 1) =>
  `0 0 ${6 * k}px ${c}, 0 0 ${18 * k}px ${c}88, 0 2px 3px rgba(0,0,0,0.9)`;
