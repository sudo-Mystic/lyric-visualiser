import type { StyleSettings, TimedWord } from "../types";

export function getWordColor(word: TimedWord, index: number, settings: StyleSettings) {
  if (word.color) return word.color;
  if (settings.colorMode === "red") return settings.colorA;
  if (settings.colorMode === "white") return settings.colorB;
  if (settings.colorMode === "custom") return settings.colorA;
  return index % 2 === 0 ? settings.colorA : settings.colorB;
}
