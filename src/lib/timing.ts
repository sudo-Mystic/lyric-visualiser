import { normalizeDocEnds } from "./lrc";
import type { LyricsDoc, TimedWord } from "./types";

export function getActiveWordIndex(words: TimedWord[], time: number) {
  if (words.length === 0 || time < words[0].start - 0.001) return -1;
  let low = 0;
  let high = words.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (words[mid].start <= time + 0.001) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}

export function getWordById(doc: LyricsDoc | null, id: string | null) {
  if (!doc || !id) return null;
  return doc.words.find((word) => word.id === id) ?? null;
}

export function getLineForWord(doc: LyricsDoc | null, word: TimedWord | null) {
  if (!doc || !word) return null;
  return doc.lines[word.line] ?? null;
}

function graphemeWeight(text: string) {
  try {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Math.max(2, Array.from(segmenter.segment(text)).length);
  } catch {
    return Math.max(2, Array.from(text).length);
  }
}

export function updateWordStart(doc: LyricsDoc, wordId: string, requestedStart: number): LyricsDoc {
  const index = doc.words.findIndex((word) => word.id === wordId);
  if (index === -1) return doc;

  const previous = doc.words[index - 1];
  const next = doc.words[index + 1];
  const min = previous ? previous.start + 0.04 : 0;
  const max = next
    ? next.start - 0.04
    : doc.duration
      ? Math.max(min, doc.duration - 0.02)
      : Number.POSITIVE_INFINITY;
  const start = Math.min(Math.max(requestedStart, min), Math.max(min, max));

  const words = doc.words.map((word, wordIndex) =>
    wordIndex === index ? { ...word, start } : word,
  );

  return normalizeDocEnds({
    ...doc,
    words,
    edited: true,
  });
}

export function updateWordColor(
  doc: LyricsDoc,
  wordId: string,
  color: string | undefined,
): LyricsDoc {
  const words = doc.words.map((word) =>
    word.id === wordId ? { ...word, color } : word,
  );
  return { ...doc, words, edited: true };
}

export function redistributeLine(doc: LyricsDoc, lineIndex: number): LyricsDoc {
  const line = doc.lines[lineIndex];
  if (!line || line.words.length === 0) return doc;

  const lineStart = line.words[0].start;
  const nextLine = doc.lines[lineIndex + 1];
  const estimated = lineStart + Math.max(1.4, line.words.length * 0.62);
  const end = nextLine ? Math.min(nextLine.start - 0.02, estimated) : estimated;
  const usable = Math.max(0.08, end - lineStart);

  const weights = line.words.map((word) => graphemeWeight(word.text));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const starts = new Map<string, number>();
  let consumed = 0;
  for (const word of line.words) {
    starts.set(word.id, lineStart + (consumed / total) * usable);
    consumed += graphemeWeight(word.text);
  }

  const words = doc.words.map((word) =>
    starts.has(word.id) ? { ...word, start: starts.get(word.id)! } : word,
  );
  return normalizeDocEnds({ ...doc, words, edited: true });
}

export function formatTime(seconds: number, milliseconds = false) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  if (!milliseconds) {
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  const ms = Math.floor((safe % 1) * 1000);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export function formatTimeShort(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}
