import type {
  BackgroundMode,
  CanvasFont,
  CanvasFormat,
  ColorMode,
  FontWeight,
  LyricsMode,
  StyleSettings,
  VisualTheme,
  WordAnimation,
} from "../types";

export type PresetComposition =
  | "swiss"
  | "letterpress"
  | "riso"
  | "tuner"
  | "journal"
  | "acid";

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
  canvasFormat: CanvasFormat;
  lyricsMode: LyricsMode;
  composition: PresetComposition;
}

export const VISUAL_THEMES: readonly VisualThemeDefinition[] = [
  {
    value: "swiss-grid",
    label: "Swiss Grid",
    caption: "A cold magazine system: hairline columns, huge justified lines and one red marker.",
    fontLabel: "Noto Sans · 16:9 justified line",
    background: "swiss",
    colorMode: "alternate",
    colorA: "#e8001d",
    colorB: "#101010",
    fontFamily: "grotesk",
    fontSize: 150,
    fontWeight: 800,
    letterSpacing: -0.025,
    rain: 0,
    glitch: 0,
    grit: 0,
    animation: "cut",
    canvasFormat: "landscape",
    lyricsMode: "line",
    composition: "swiss",
  },
  {
    value: "letterpress-ink",
    label: "Letterpress Ink",
    caption: "A dry proof sheet: pressedRozha type, pale red registration and a rubber-stamp seal.",
    fontLabel: "Rozha One · 4:5 stacked proof",
    background: "paper",
    colorMode: "alternate",
    colorA: "#8f1d16",
    colorB: "#17120d",
    fontFamily: "rozha",
    fontSize: 158,
    fontWeight: 400,
    letterSpacing: -0.008,
    rain: 0,
    glitch: 4,
    grit: 28,
    animation: "fade",
    canvasFormat: "portrait",
    lyricsMode: "stack",
    composition: "letterpress",
  },
  {
    value: "riso-register",
    label: "Riso Register",
    caption: "A mis-registered print: pink and teal plates print the same word side by side.",
    fontLabel: "Noto Sans · 1:1 offset plates",
    background: "black",
    colorMode: "alternate",
    colorA: "#ff4da6",
    colorB: "#16d9d4",
    fontFamily: "sans",
    fontSize: 172,
    fontWeight: 900,
    letterSpacing: 0.008,
    rain: 0,
    glitch: 18,
    grit: 32,
    animation: "cut",
    canvasFormat: "square",
    lyricsMode: "word",
    composition: "riso",
  },
  {
    value: "analog-tuner",
    label: "Analog Tuner",
    caption: "A vacuum-tube dial: amber marker, frequency ticks and a warm signal glow.",
    fontLabel: "Yatra One · 9:16 tuner line",
    background: "dusk",
    colorMode: "alternate",
    colorA: "#ffb04a",
    colorB: "#ffe6c7",
    fontFamily: "yatra",
    fontSize: 188,
    fontWeight: 400,
    letterSpacing: 0.01,
    rain: 0,
    glitch: 24,
    grit: 46,
    animation: "cut",
    canvasFormat: "story",
    lyricsMode: "line",
    composition: "tuner",
  },
  {
    value: "night-journal",
    label: "Night Journal",
    caption: "A private notebook under a lamp: wide rivers of hairline light, soft margins, no weather.",
    fontLabel: "Kalam · 4:5 hand ledger",
    background: "aurora",
    colorMode: "alternate",
    colorA: "#8ff5c3",
    colorB: "#eafaf1",
    fontFamily: "kalam",
    fontSize: 196,
    fontWeight: 700,
    letterSpacing: -0.012,
    rain: 0,
    glitch: 6,
    grit: 7,
    animation: "fade",
    canvasFormat: "portrait",
    lyricsMode: "line",
    composition: "journal",
  },
  {
    value: "acid-kinetic",
    label: "Acid Kinetic",
    caption: "A poster ripped wide: acid yellow and black, massive outlined words and a hard pop.",
    fontLabel: "Noto Sans · 16:9 poster word",
    background: "black",
    colorMode: "red",
    colorA: "#d7ff00",
    colorB: "#111111",
    fontFamily: "grotesk",
    fontSize: 232,
    fontWeight: 900,
    letterSpacing: -0.04,
    rain: 0,
    glitch: 58,
    grit: 38,
    animation: "pop",
    canvasFormat: "landscape",
    lyricsMode: "word",
    composition: "acid",
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
    canvasFormat: theme.canvasFormat,
    lyricsMode: theme.lyricsMode,
  };
}
