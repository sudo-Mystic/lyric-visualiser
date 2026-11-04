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

/**
 * Six presets that are different engines, not six paint jobs.
 *
 * Every preset differs from every other on ALL of these axes at once:
 *  - layout: where the text lives on the frame
 *  - reading: what unit the viewer reads (one word / a line / a transcript)
 *  - motion: how text enters and moves (cut / fill / slam / scroll / flicker / pop)
 *  - type: solid distressed vs clean fill vs outline vs mono vs bubble type
 *  - background: its own painted world, not a shared texture with a new colour
 *
 * If a future preset only changes a colour, a font or a format, it does not
 * belong here. It needs its own draw path in Visualizer.ts.
 */
export interface VisualThemeDefinition {
  value: VisualTheme;
  label: string;
  caption: string;
  fontLabel: string;
  /** Where the text lives. Must be unique across all six. */
  layout: string;
  /** What the viewer reads. Must be unique across all six. */
  reading: string;
  /** How text moves. Must be unique across all six. */
  motion: string;
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
}

export const VISUAL_THEMES: readonly VisualThemeDefinition[] = [
  {
    value: "raakh-grunge",
    label: "Raakh Grunge",
    caption:
      "The original reel. One distressed word dead centre on black, rain on glass over everything, glitch slices on the beat.",
    fontLabel: "Noto Sans · 9:16 · distressed solid",
    layout: "One word, dead centre",
    reading: "One word at a time",
    motion: "Hard cut, then glitch",
    background: "grunge",
    colorMode: "alternate",
    colorA: "#ff252b",
    colorB: "#f4f1e8",
    fontFamily: "grotesk",
    fontSize: 210,
    fontWeight: 900,
    letterSpacing: 0,
    rain: 58,
    glitch: 42,
    grit: 64,
    animation: "cut",
    canvasFormat: "story",
    lyricsMode: "word",
  },
  {
    value: "karaoke-stage",
    label: "Singalong Stage",
    caption:
      "A TV singalong, not a reel. The whole line sits in the bottom third and fills in yellow word by word under a spotlight. Nothing pops, nothing is distressed.",
    fontLabel: "Noto Sans · 16:9 · clean fill",
    layout: "Full line, bottom third",
    reading: "Whole line, word fill",
    motion: "Colour fill + sweeping underline",
    background: "stage",
    colorMode: "alternate",
    colorA: "#ffd60a",
    colorB: "#f2f2f2",
    fontFamily: "sans",
    fontSize: 118,
    fontWeight: 800,
    letterSpacing: -0.01,
    rain: 0,
    glitch: 0,
    grit: 0,
    animation: "steady",
    canvasFormat: "landscape",
    lyricsMode: "line",
  },
  {
    value: "kinetic-collage",
    label: "Kinetic Collage",
    caption:
      "A rap poster mid-explosion. Each new word slams in rotated at a random spot, and the last four words stay behind it as a collage. No centre, no single hero word.",
    fontLabel: "Noto Sans · 1:1 · distressed poster",
    layout: "Scattered, rotated, overlapping",
    reading: "New word over a word collage",
    motion: "Slam, rotate and settle",
    background: "collage-paper",
    colorMode: "alternate",
    colorA: "#e8001d",
    colorB: "#111111",
    fontFamily: "grotesk",
    fontSize: 190,
    fontWeight: 900,
    letterSpacing: -0.02,
    rain: 0,
    glitch: 0,
    grit: 38,
    animation: "slam",
    canvasFormat: "square",
    lyricsMode: "collage",
  },
  {
    value: "terminal-scroll",
    label: "Terminal Scroll",
    caption:
      "A live transcript log. Small green monospace lines scroll upward, left-aligned, with a prompt marker on the line being sung. No hero word, no poster, no glow.",
    fontLabel: "JetBrains Mono · 4:5 · terminal",
    layout: "Left-aligned scrolling log",
    reading: "Scrolling transcript, 7 lines",
    motion: "Lines scroll up, cursor blinks",
    background: "terminal",
    colorMode: "alternate",
    colorA: "#4dff88",
    colorB: "#1d3a26",
    fontFamily: "mono",
    fontSize: 62,
    fontWeight: 700,
    letterSpacing: 0,
    rain: 0,
    glitch: 0,
    grit: 0,
    animation: "steady",
    canvasFormat: "portrait",
    lyricsMode: "scroll",
  },
  {
    value: "neon-sign",
    label: "Neon Sign",
    caption:
      "A sign on a night street. The word is outline-only neon with a glow, a reflection underneath, and a perspective grid running to the horizon. No solid fill at all.",
    fontLabel: "Noto Sans · 16:9 · outline neon",
    layout: "One word, sign + reflection",
    reading: "One word, lit letter by letter",
    motion: "Flicker on, steady glow",
    background: "neon-night",
    colorMode: "alternate",
    colorA: "#00e5ff",
    colorB: "#ff2e88",
    fontFamily: "grotesk",
    fontSize: 190,
    fontWeight: 800,
    letterSpacing: 0.01,
    rain: 0,
    glitch: 0,
    grit: 0,
    animation: "steady",
    canvasFormat: "landscape",
    lyricsMode: "word",
  },
  {
    value: "comic-pop",
    label: "Comic Pop",
    caption:
      "A comic panel. The word bursts inside a white speech bubble with a thick black outline, over halftone dots, with a black caption strip of the previous line on top.",
    fontLabel: "Noto Sans · 4:5 · bubble type",
    layout: "Word inside a speech bubble",
    reading: "One word in a bubble + caption strip",
    motion: "Pop with overshoot and wobble",
    background: "comic-dots",
    colorMode: "alternate",
    colorA: "#111111",
    colorB: "#ffffff",
    fontFamily: "grotesk",
    fontSize: 190,
    fontWeight: 900,
    letterSpacing: -0.01,
    rain: 0,
    glitch: 0,
    grit: 0,
    animation: "pop",
    canvasFormat: "portrait",
    lyricsMode: "word",
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
