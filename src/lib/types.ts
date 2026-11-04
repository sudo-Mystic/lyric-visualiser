export type ColorMode = "alternate" | "red" | "white" | "custom";
export type BackgroundMode =
  | "black"
  | "blood"
  | "paper"
  | "monsoon"
  | "aurora"
  | "dusk"
  | "signal";
export type WordAnimation = "cut" | "pop" | "fade";
export type FontWeight = 400 | 700 | 800 | 900;
export type LyricsOrigin = "lrc" | "plain" | "lrclib" | "manual";
export type CanvasFormat = "story" | "portrait" | "square" | "landscape";
export type LyricsMode = "word" | "line" | "stack";
export type VisualTheme =
  | "obsidian"
  | "neon-monsoon"
  | "papyrus"
  | "aurora"
  | "ember-dusk"
  | "ink-signal";
export type CanvasFont = "sans" | "mono" | "rozha" | "kalam" | "yatra";

export interface StyleSettings {
  colorMode: ColorMode;
  colorA: string;
  colorB: string;
  fontSize: number;
  fontWeight: FontWeight;
  background: BackgroundMode;
  rain: number;
  glitch: number;
  grit: number;
  animation: WordAnimation;
  offsetMs: number;
  canvasFormat: CanvasFormat;
  lyricsMode: LyricsMode;
  theme: VisualTheme;
  fontFamily: CanvasFont;
  letterSpacing: number;
}

export const REFERENCE_STYLE: StyleSettings = {
  colorMode: "alternate",
  colorA: "#ff252b",
  colorB: "#f4f1e8",
  fontSize: 210,
  fontWeight: 900,
  background: "black",
  rain: 58,
  glitch: 42,
  grit: 64,
  animation: "cut",
  offsetMs: 0,
  canvasFormat: "story",
  lyricsMode: "word",
  theme: "obsidian",
  fontFamily: "sans",
  letterSpacing: 0,
};

export interface TimedWord {
  id: string;
  text: string;
  start: number;
  end: number;
  line: number;
  color?: string;
}

export interface LyricLine {
  index: number;
  start: number;
  end: number;
  words: TimedWord[];
}

export interface LyricsDoc {
  title?: string;
  artist?: string;
  album?: string;
  source: LyricsOrigin;
  sourceLabel: string;
  words: TimedWord[];
  lines: LyricLine[];
  wordLevel: boolean;
  approximate: boolean;
  edited: boolean;
  trackKey?: string;
  duration?: number;
  lrclibId?: number;
}

export interface SearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export interface AudioTrack {
  file: File;
  url: string;
  name: string;
  duration: number;
}
