export type ColorMode = "alternate" | "red" | "white" | "custom";
export type BackgroundMode =
  | "grunge"
  | "stage"
  | "collage-paper"
  | "terminal"
  | "neon-night"
  | "comic-dots";
export type WordAnimation = "cut" | "pop" | "fade" | "slam" | "steady";
export type FontWeight = 400 | 700 | 800 | 900;
export type LyricsOrigin = "lrc" | "plain" | "lrclib" | "manual";
export type CanvasFormat = "story" | "portrait" | "square" | "landscape";
export type LyricsMode = "word" | "line" | "stack" | "scroll" | "collage";
export type VisualTheme =
  | "raakh-grunge"
  | "karaoke-stage"
  | "kinetic-collage"
  | "terminal-scroll"
  | "neon-sign"
  | "comic-pop";
export type CanvasFont = "grotesk" | "rozha" | "mono" | "yatra" | "kalam" | "sans";

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

/**
 * The original reference look: the @shivu_edtix reel. Black, one distressed
 * Devanagari word at a time in the centre, rain on glass, glitch slices.
 * It is kept as exactly one of the six presets, not as the template for
 * the other five.
 */
export const REFERENCE_STYLE: StyleSettings = {
  colorMode: "alternate",
  colorA: "#ff252b",
  colorB: "#f4f1e8",
  fontSize: 210,
  fontWeight: 900,
  background: "grunge",
  rain: 58,
  glitch: 42,
  grit: 64,
  animation: "cut",
  offsetMs: 0,
  canvasFormat: "story",
  lyricsMode: "word",
  theme: "raakh-grunge",
  fontFamily: "grotesk",
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
