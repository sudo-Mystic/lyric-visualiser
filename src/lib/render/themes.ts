import type {
  BackgroundMode,
  CanvasFont,
  ColorMode,
  FontWeight,
  StyleSettings,
  VisualTheme,
  WordAnimation,
} from "../types";

export interface VisualThemeDefinition {
  value: VisualTheme;
  label: string;
  caption: string;
  fontLabel: string;
  background: BackgroundMode;
  colorMode: ColorMode;
  colorA: string;
  colorB: string;
  fontFamily: CanvasFont;
  fontSize: number;
  fontWeight: FontWeight;
  letterSpacing: number;
  rain: number;
  glitch: number;
  grit: number;
  animation: WordAnimation;
}

export const VISUAL_THEMES: readonly VisualThemeDefinition[] = [
  {
    value: "obsidian",
    label: "Obsidian",
    caption: "Black lacquer, distressed grotesque type, rain, blood accent.",
    fontLabel: "Noto Sans · abrasive",
    background: "black",
    colorMode: "alternate",
    colorA: "#ff252b",
    colorB: "#f4f1e8",
    fontFamily: "sans",
    fontSize: 210,
    fontWeight: 900,
    letterSpacing: 0,
    rain: 58,
    glitch: 42,
    grit: 72,
    animation: "cut",
  },
  {
    value: "neon-monsoon",
    label: "Neon Monsoon",
    caption: "Droplets, teal depth, monospaced tracking and a HUD frame.",
    fontLabel: "JetBrains Mono · spaced",
    background: "monsoon",
    colorMode: "alternate",
    colorA: "#6ee7ff",
    colorB: "#d7f5fb",
    fontFamily: "mono",
    fontSize: 190,
    fontWeight: 700,
    letterSpacing: 0.035,
    rain: 86,
    glitch: 12,
    grit: 22,
    animation: "pop",
  },
  {
    value: "papyrus",
    label: "Papyrus",
    caption: "Ink on fibre paper, serif display type, a stamp and margin rules.",
    fontLabel: "Rozha One · letterpress",
    background: "paper",
    colorMode: "alternate",
    colorA: "#a42318",
    colorB: "#17120d",
    fontFamily: "rozha",
    fontSize: 178,
    fontWeight: 400,
    letterSpacing: 0,
    rain: 0,
    glitch: 6,
    grit: 14,
    animation: "fade",
  },
  {
    value: "aurora",
    label: "Aurora",
    caption: "Ribbons of light, hand-drawn lettering and star ticks.",
    fontLabel: "Kalam · hand-drawn",
    background: "aurora",
    colorMode: "alternate",
    colorA: "#62f0b6",
    colorB: "#eefbf5",
    fontFamily: "kalam",
    fontSize: 208,
    fontWeight: 700,
    letterSpacing: -0.01,
    rain: 16,
    glitch: 18,
    grit: 8,
    animation: "pop",
  },
  {
    value: "ember-dusk",
    label: "Ember Dusk",
    caption: "Rising coals, charred edges and display Devanagari.",
    fontLabel: "Yatra One · scorched",
    background: "dusk",
    colorMode: "alternate",
    colorA: "#ffad42",
    colorB: "#ffe7c1",
    fontFamily: "yatra",
    fontSize: 204,
    fontWeight: 400,
    letterSpacing: 0.01,
    rain: 24,
    glitch: 18,
    grit: 58,
    animation: "cut",
  },
  {
    value: "ink-signal",
    label: "Ink Signal",
    caption: "CRT grid, scanlines, interference and a terminal margin.",
    fontLabel: "JetBrains Mono · signal",
    background: "signal",
    colorMode: "alternate",
    colorA: "#00e5ff",
    colorB: "#f4f7ff",
    fontFamily: "mono",
    fontSize: 196,
    fontWeight: 800,
    letterSpacing: 0.045,
    rain: 8,
    glitch: 86,
    grit: 10,
    animation: "pop",
  },
] as const;

const FALLBACK = VISUAL_THEMES[0];

export function visualTheme(value: VisualTheme): VisualThemeDefinition {
  return VISUAL_THEMES.find((theme) => theme.value === value) ?? FALLBACK;
}

export function themePreset(value: VisualTheme): Partial<StyleSettings> {
  const theme = visualTheme(value);
  return {
    theme: theme.value,
    background: theme.background,
    colorMode: theme.colorMode,
    colorA: theme.colorA,
    colorB: theme.colorB,
    fontFamily: theme.fontFamily,
    fontSize: theme.fontSize,
    fontWeight: theme.fontWeight,
    letterSpacing: theme.letterSpacing,
    rain: theme.rain,
    glitch: theme.glitch,
    grit: theme.grit,
    animation: theme.animation,
  };
}
