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
  | "monolith"
  | "hud"
  | "letter"
  | "ribbon"
  | "cinder"
  | "terminal";

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
    value: "obsidian",
    label: "Obsidian Monolith",
    caption: "A vertical black monolith: one huge battered word, rain-lens water, bone and blood.",
    fontLabel: "Noto Sans Black · 9:16 word monolith",
    background: "black",
    colorMode: "alternate",
    colorA: "#ff252b",
    colorB: "#f4f1e8",
    fontFamily: "sans",
    fontSize: 238,
    fontWeight: 900,
    letterSpacing: 0,
    rain: 64,
    glitch: 46,
    grit: 82,
    animation: "cut",
    canvasFormat: "story",
    lyricsMode: "word",
    composition: "monolith",
  },
  {
    value: "neon-monsoon",
    label: "Neon Monsoon HUD",
    caption: "A wide teal instrument panel: spaced mono lines, corner brackets, rulers and heavy rain.",
    fontLabel: "JetBrains Mono · 16:9 line HUD",
    background: "monsoon",
    colorMode: "alternate",
    colorA: "#6ee7ff",
    colorB: "#d7f5fb",
    fontFamily: "mono",
    fontSize: 182,
    fontWeight: 700,
    letterSpacing: 0.04,
    rain: 88,
    glitch: 12,
    grit: 22,
    animation: "pop",
    canvasFormat: "landscape",
    lyricsMode: "line",
    composition: "hud",
  },
  {
    value: "papyrus",
    label: "Papyrus Letter",
    caption: "A printed letter on fibre paper: serif Rozha, three stacked lines, red seal and rules.",
    fontLabel: "Rozha One · 4:5 stacked letter",
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
    canvasFormat: "portrait",
    lyricsMode: "stack",
    composition: "letter",
  },
  {
    value: "aurora",
    label: "Aurora Ribbon",
    caption: "A square night sky: hand-drawn Kalam lines flow over aurora ribbons, stars and green glow.",
    fontLabel: "Kalam · 1:1 flowing line",
    background: "aurora",
    colorMode: "alternate",
    colorA: "#62f0b6",
    colorB: "#eefbf5",
    fontFamily: "kalam",
    fontSize: 202,
    fontWeight: 700,
    letterSpacing: -0.01,
    rain: 14,
    glitch: 16,
    grit: 8,
    animation: "pop",
    canvasFormat: "square",
    lyricsMode: "line",
    composition: "ribbon",
  },
  {
    value: "ember-dusk",
    label: "Ember Cinder",
    caption: "A vertical forge: scorched display type, three stacked lines and coals rising through smoke.",
    fontLabel: "Yatra One · 9:16 stacked cinder",
    background: "dusk",
    colorMode: "alternate",
    colorA: "#ffad42",
    colorB: "#ffe7c1",
    fontFamily: "yatra",
    fontSize: 194,
    fontWeight: 400,
    letterSpacing: 0.01,
    rain: 18,
    glitch: 18,
    grit: 66,
    animation: "cut",
    canvasFormat: "story",
    lyricsMode: "stack",
    composition: "cinder",
  },
  {
    value: "ink-signal",
    label: "Terminal Static",
    caption: "A vertical CRT: stacked mono text, grid, scan beam, side progress and RGB interference.",
    fontLabel: "JetBrains Mono · 4:5 terminal",
    background: "signal",
    colorMode: "alternate",
    colorA: "#00e5ff",
    colorB: "#f4f7ff",
    fontFamily: "mono",
    fontSize: 184,
    fontWeight: 800,
    letterSpacing: 0.045,
    rain: 6,
    glitch: 88,
    grit: 10,
    animation: "pop",
    canvasFormat: "portrait",
    lyricsMode: "stack",
    composition: "terminal",
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
